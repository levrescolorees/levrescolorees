import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ========== SECURITY UTILITIES ==========

function generateRequestId(): string { return crypto.randomUUID() }

function validateUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

function slog(rid: string, level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) {
  const payload = { request_id: rid, level, msg, ...extra }
  if (level === 'error') console.error(JSON.stringify(payload))
  else console.log(JSON.stringify(payload))
}

// ========== RATE LIMITING ==========

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 }); return false }
  entry.count++
  return entry.count > 30
}

// ========== HANDLER ==========

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const rid = generateRequestId()

  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    // --- Rate limit ---
    if (isRateLimited(clientIp)) {
      slog(rid, 'warn', 'Rate limited', { ip: clientIp })
      return new Response(JSON.stringify({
        payment_status: 'unknown', order_status: 'unknown', payment_method: 'unknown',
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const url = new URL(req.url)
    const orderId = url.searchParams.get('order_id')

    // --- Validate UUID ---
    if (!orderId || !validateUUID(orderId)) {
      // Return same format to not leak information
      return new Response(JSON.stringify({
        payment_status: 'unknown', order_status: 'unknown', payment_method: 'unknown',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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
      // Same format — don't leak whether order exists
      return new Response(JSON.stringify({
        payment_status: 'unknown', order_status: 'unknown', payment_method: 'unknown',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Active check: if still pending and has payment_id, query MP API directly
    if (order.payment_status === 'pending' && order.payment_id) {
      try {
        const { data: settings } = await supabaseAdmin
          .from('store_settings').select('value').eq('key', 'mercado_pago').single()
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
                payment_status: 'approved', status: 'confirmado', payment_details: mpData,
              }).eq('id', orderId)

              await supabaseAdmin.from('order_status_history').insert({
                order_id: orderId, from_status: order.status, to_status: 'confirmado',
                note: 'Pagamento aprovado (verificação ativa)',
              })

              return new Response(JSON.stringify({
                payment_status: 'approved', order_status: 'confirmado', payment_method: order.payment_method,
              }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
              await supabaseAdmin.from('orders').update({ payment_status: mpStatus }).eq('id', orderId)

              return new Response(JSON.stringify({
                payment_status: mpStatus, order_status: order.status, payment_method: order.payment_method,
              }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
          }
        }
      } catch (mpErr) {
        slog(rid, 'error', 'MP active check error', { error: String(mpErr) })
      }
    }

    return new Response(JSON.stringify({
      payment_status: order.payment_status, order_status: order.status, payment_method: order.payment_method,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    slog(rid, 'error', 'Unhandled error', { error: String(err) })
    return new Response(JSON.stringify({
      payment_status: 'unknown', order_status: 'unknown', payment_method: 'unknown',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
