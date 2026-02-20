import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    if (body.type !== 'payment' && body.action !== 'payment.updated' && body.action !== 'payment.created') {
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const paymentId = body.data?.id
    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'No payment ID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Read access_token from store_settings, fallback to env
    let mpToken = ''
    const { data: mpSettings } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'mercado_pago')
      .single()
    if (mpSettings?.value) {
      mpToken = (mpSettings.value as any).access_token || ''
    }
    if (!mpToken) {
      mpToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || ''
    }

    if (!mpToken) {
      console.error('No MP access_token configured')
      return new Response(JSON.stringify({ error: 'Gateway not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch payment details from MP API
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mpToken}` },
    })
    const mpData = await mpRes.json()

    if (!mpRes.ok) {
      console.error('Failed to fetch MP payment:', mpData)
      return new Response(JSON.stringify({ error: 'Failed to verify payment' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const orderId = mpData.external_reference || mpData.metadata?.order_id
    if (!orderId) {
      console.error('No order reference in payment:', paymentId)
      return new Response(JSON.stringify({ error: 'No order reference' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: order, error: oErr } = await supabaseAdmin
      .from('orders')
      .select('id, total, status, payment_status')
      .eq('id', orderId)
      .single()

    if (oErr || !order) {
      console.error('Order not found:', orderId)
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const statusMap: Record<string, { payment: string; order: string | null }> = {
      'approved': { payment: 'approved', order: 'confirmado' },
      'rejected': { payment: 'rejected', order: 'cancelado' },
      'cancelled': { payment: 'cancelled', order: 'cancelado' },
      'refunded': { payment: 'refunded', order: 'cancelado' },
      'charged_back': { payment: 'refunded', order: 'cancelado' },
      'pending': { payment: 'pending', order: null },
      'in_process': { payment: 'pending', order: null },
      'authorized': { payment: 'pending', order: null },
    }

    const mapped = statusMap[mpData.status] || { payment: mpData.status, order: null }

    const update: any = {
      payment_status: mapped.payment,
      payment_details: mpData,
      payment_id: String(mpData.id),
    }

    if (mapped.order && mapped.order !== order.status) {
      update.status = mapped.order
      await supabaseAdmin.from('order_status_history').insert({
        order_id: orderId, from_status: order.status, to_status: mapped.order,
        note: `Webhook MP: ${mpData.status} (payment ${mpData.id})`,
      })
    }

    await supabaseAdmin.from('orders').update(update).eq('id', orderId)

    console.log(`Webhook processed: order=${orderId}, mp_status=${mpData.status}, payment_status=${mapped.payment}`)

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('mp-webhook error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
