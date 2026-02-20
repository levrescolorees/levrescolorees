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
    const url = new URL(req.url)
    const orderId = url.searchParams.get('order_id')

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'order_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('payment_status, status, payment_method, payment_id')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return new Response(JSON.stringify({ error: 'Pedido não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Active check: if still pending and has payment_id, query MP API directly
    if (order.payment_status === 'pending' && order.payment_id) {
      try {
        // Get access token from store_settings
        const { data: settings } = await supabaseAdmin
          .from('store_settings')
          .select('value')
          .eq('key', 'mercado_pago')
          .single()

        const mpToken = (settings?.value as any)?.access_token || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || ''

        if (mpToken) {
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${order.payment_id}`, {
            headers: { 'Authorization': `Bearer ${mpToken}` },
          })

          if (mpRes.ok) {
            const mpData = await mpRes.json()
            const mpStatus = mpData.status

            if (mpStatus === 'approved') {
              await supabaseAdmin.from('orders').update({
                payment_status: 'approved',
                status: 'confirmado',
                payment_details: mpData,
              }).eq('id', orderId)

              await supabaseAdmin.from('order_status_history').insert({
                order_id: orderId,
                from_status: order.status,
                to_status: 'confirmado',
                note: 'Pagamento aprovado (verificação ativa)',
              })

              return new Response(JSON.stringify({
                payment_status: 'approved',
                order_status: 'confirmado',
                payment_method: order.payment_method,
              }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              })
            } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
              await supabaseAdmin.from('orders').update({
                payment_status: mpStatus,
              }).eq('id', orderId)

              return new Response(JSON.stringify({
                payment_status: mpStatus,
                order_status: order.status,
                payment_method: order.payment_method,
              }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              })
            }
          }
        }
      } catch (mpErr) {
        console.error('MP active check error:', mpErr)
        // Fall through to return DB status
      }
    }

    return new Response(JSON.stringify({
      payment_status: order.payment_status,
      order_status: order.status,
      payment_method: order.payment_method,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('payment-status error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
