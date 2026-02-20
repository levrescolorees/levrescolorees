import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ========== SECURITY UTILITIES ==========

function generateRequestId(): string { return crypto.randomUUID() }

function slog(rid: string, level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) {
  const payload = { request_id: rid, level, msg, ...extra }
  if (level === 'error') console.error(JSON.stringify(payload))
  else console.log(JSON.stringify(payload))
}

async function constantTimeCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode('compare'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sigA = await crypto.subtle.sign('HMAC', key, encoder.encode(a))
  const sigB = await crypto.subtle.sign('HMAC', key, encoder.encode(b))
  const viewA = new Uint8Array(sigA)
  const viewB = new Uint8Array(sigB)
  if (viewA.length !== viewB.length) return false
  let result = 0
  for (let i = 0; i < viewA.length; i++) result |= viewA[i] ^ viewB[i]
  return result === 0
}

async function auditLog(
  supabaseAdmin: any, action: string,
  opts: { entity_type?: string; entity_id?: string; ip?: string; request_id?: string; details?: Record<string, unknown> }
) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action, entity_type: opts.entity_type || null, entity_id: opts.entity_id || null,
      ip_address: opts.ip || null, request_id: opts.request_id || null, details: opts.details || {},
    })
  } catch { /* never break flow */ }
}

// ========== RATE LIMITING ==========

const webhookRateMap = new Map<string, { count: number; resetAt: number }>()
function isWebhookRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = webhookRateMap.get(ip)
  if (!entry || now > entry.resetAt) { webhookRateMap.set(ip, { count: 1, resetAt: now + 60_000 }); return false }
  entry.count++
  return entry.count > 100
}

// ========== HMAC SIGNATURE VERIFICATION ==========

async function verifyMpSignature(
  req: Request, dataId: string, webhookSecret: string
): Promise<boolean> {
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id') || ''

  if (!xSignature || !webhookSecret) return false

  // Parse x-signature: "ts=1234567890,v1=abc123def..."
  const parts: Record<string, string> = {}
  for (const part of xSignature.split(',')) {
    const [key, ...rest] = part.split('=')
    if (key && rest.length) parts[key.trim()] = rest.join('=').trim()
  }

  const ts = parts['ts']
  const v1 = parts['v1']
  if (!ts || !v1) return false

  // Reject if timestamp is older than 5 minutes (replay protection)
  const tsNum = parseInt(ts, 10)
  if (isNaN(tsNum)) return false
  const ageMs = Date.now() - tsNum * 1000
  if (ageMs > 5 * 60 * 1000 || ageMs < -60 * 1000) return false

  // Build manifest template per MP docs
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`

  // Compute HMAC-SHA256
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest))
  const computedHash = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

  return await constantTimeCompare(computedHash, v1)
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
    if (isWebhookRateLimited(clientIp)) {
      slog(rid, 'warn', 'Webhook rate limited', { ip: clientIp })
      return new Response(JSON.stringify({ error: 'Rate limited' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()

    if (body.type !== 'payment' && body.action !== 'payment.updated' && body.action !== 'payment.created') {
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const paymentId = body.data?.id
    if (!paymentId) {
      slog(rid, 'warn', 'No payment ID in webhook body')
      return new Response(JSON.stringify({ error: 'No payment ID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // --- Get MP config + webhook secret ---
    let mpToken = ''
    let webhookSecret = ''
    const { data: mpSettings } = await supabaseAdmin
      .from('store_settings').select('value').eq('key', 'mercado_pago').single()
    if (mpSettings?.value) {
      const v = mpSettings.value as any
      mpToken = v.access_token || ''
      webhookSecret = v.webhook_secret || ''
    }
    if (!mpToken) mpToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || ''

    // --- Validate HMAC signature (if secret configured) ---
    if (webhookSecret) {
      const valid = await verifyMpSignature(req, String(paymentId), webhookSecret)
      if (!valid) {
        slog(rid, 'error', 'Invalid webhook signature', { ip: clientIp, payment_id: paymentId })
        await auditLog(supabaseAdmin, 'webhook_invalid_signature', {
          entity_type: 'webhook', entity_id: String(paymentId),
          ip: clientIp, request_id: rid,
          details: { payment_id: paymentId },
        })
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      slog(rid, 'info', 'Webhook signature verified', { payment_id: paymentId })
    } else {
      slog(rid, 'warn', 'No webhook_secret configured, skipping signature check', { payment_id: paymentId })
    }

    if (!mpToken) {
      slog(rid, 'error', 'No MP access_token configured')
      return new Response(JSON.stringify({ error: 'Gateway not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Fetch payment from MP API ---
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mpToken}` },
    })
    const mpData = await mpRes.json()

    if (!mpRes.ok) {
      slog(rid, 'error', 'Failed to fetch MP payment', { payment_id: paymentId, mp_error: mpData.message })
      return new Response(JSON.stringify({ error: 'Failed to verify payment' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Validate external_reference ---
    const orderId = mpData.external_reference || mpData.metadata?.order_id
    if (!orderId) {
      slog(rid, 'error', 'No order reference in payment', { payment_id: paymentId })
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
      slog(rid, 'error', 'Order not found', { order_id: orderId })
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Validate currency ---
    if (mpData.currency_id && mpData.currency_id !== 'BRL') {
      slog(rid, 'error', 'Invalid currency', { currency: mpData.currency_id, order_id: orderId })
      await auditLog(supabaseAdmin, 'webhook_invalid_currency', {
        entity_type: 'order', entity_id: orderId, request_id: rid,
        details: { expected: 'BRL', received: mpData.currency_id },
      })
      return new Response(JSON.stringify({ error: 'Invalid currency' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Validate amount (tolerance R$ 0.05) ---
    if (mpData.transaction_amount && Math.abs(mpData.transaction_amount - Number(order.total)) > 0.05) {
      slog(rid, 'error', 'Amount mismatch', {
        order_id: orderId, expected: order.total, received: mpData.transaction_amount,
      })
      await auditLog(supabaseAdmin, 'webhook_amount_mismatch', {
        entity_type: 'order', entity_id: orderId, request_id: rid,
        details: { expected: Number(order.total), received: mpData.transaction_amount },
      })
      // Don't block — just log. MP may include fees.
    }

    // --- Map statuses ---
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

    slog(rid, 'info', 'Webhook processed', {
      order_id: orderId, mp_status: mpData.status, payment_status: mapped.payment,
    })

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    slog(rid, 'error', 'Webhook unhandled error', { error: String(err) })
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
