import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function generateRequestId(): string {
  return crypto.randomUUID();
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function slog(rid: string, level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) {
  const payload = { request_id: rid, level, msg, ...extra };
  if (level === 'error') {
    console.error(JSON.stringify(payload));
    return;
  }
  console.log(JSON.stringify(payload));
}

async function timingSafeEquals(a: string, b: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('webhook-signature-compare'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sigA = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(a));
  const sigB = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(b));
  const bytesA = new Uint8Array(sigA);
  const bytesB = new Uint8Array(sigB);

  if (bytesA.length !== bytesB.length) return false;

  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}

async function verifyMpSignature(req: Request, dataId: string, webhookSecret: string): Promise<boolean> {
  const xSignature = req.headers.get('x-signature') || '';
  const xRequestId = req.headers.get('x-request-id') || '';
  if (!xSignature || !webhookSecret) return false;

  const parts: Record<string, string> = {};
  for (const part of xSignature.split(',')) {
    const [key, ...rest] = part.split('=');
    if (key && rest.length) {
      parts[key.trim()] = rest.join('=').trim();
    }
  }

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const tsNumber = Number(ts);
  if (!Number.isFinite(tsNumber)) return false;

  const ageMs = Date.now() - tsNumber * 1000;
  if (ageMs > 5 * 60 * 1000 || ageMs < -60 * 1000) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const computed = Array.from(new Uint8Array(sig)).map(x => x.toString(16).padStart(2, '0')).join('');

  return timingSafeEquals(computed, v1);
}

async function consumeRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  identifier: string,
  windowSeconds: number,
  limit: number,
): Promise<boolean> {
  const { data, error } = await (supabaseAdmin as any).rpc('consume_rate_limit', {
    p_identifier: identifier,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });

  if (error || !data) return true;
  return !!data.allowed;
}

async function registerWebhookEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  eventKey: string,
): Promise<boolean> {
  const { data, error } = await (supabaseAdmin as any).rpc('register_webhook_event', {
    p_provider: 'mercadopago',
    p_event_key: eventKey,
  });

  if (error) return false;
  return !!data;
}

async function auditLog(
  supabaseAdmin: ReturnType<typeof createClient>,
  action: string,
  details: Record<string, unknown>,
  requestId: string,
  ip: string,
) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action,
      entity_type: 'webhook',
      request_id: requestId,
      ip_address: ip,
      details,
    });
  } catch {
    // no-op
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rid = generateRequestId();

  try {
    const body = await req.json();
    const paymentId = body?.data?.id ? String(body.data.id) : '';

    if (!paymentId) {
      return jsonResponse({ error: 'No payment ID' }, 400);
    }

    if (body?.type !== 'payment' && body?.action !== 'payment.updated' && body?.action !== 'payment.created') {
      return jsonResponse({ received: true }, 200);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateAllowed = await consumeRateLimit(supabaseAdmin, `mp-webhook:ip:${clientIp}`, 60, 120);
    if (!rateAllowed) {
      slog(rid, 'warn', 'Webhook rate limited', { ip: clientIp });
      return jsonResponse({ error: 'Rate limited' }, 429);
    }

    const { data: mpSettings } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'mercado_pago')
      .single();

    const mpValue = (mpSettings?.value || {}) as any;
    const mpEnvironment = String(mpValue.environment || Deno.env.get('MERCADO_PAGO_ENVIRONMENT') || 'sandbox').toLowerCase();
    const webhookSecret = String(mpValue.webhook_secret || Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET') || '');
    const mpToken = String(mpValue.access_token || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '');

    const signatureRequired = mpEnvironment === 'production';
    if (signatureRequired && !webhookSecret) {
      slog(rid, 'error', 'Missing webhook secret in production');
      return jsonResponse({ error: 'Webhook secret not configured' }, 500);
    }

    if (webhookSecret) {
      const valid = await verifyMpSignature(req, paymentId, webhookSecret);
      if (!valid) {
        await auditLog(supabaseAdmin, 'webhook_invalid_signature', {
          payment_id: paymentId,
        }, rid, clientIp);
        return jsonResponse({ error: 'Invalid signature' }, 401);
      }
    } else if (signatureRequired) {
      return jsonResponse({ error: 'Invalid signature' }, 401);
    }

    const rawEventKey = `raw:${paymentId}:${body?.action || body?.type || 'unknown'}:${req.headers.get('x-request-id') || 'no-request-id'}`;
    const rawEventAccepted = await registerWebhookEvent(supabaseAdmin, rawEventKey);
    if (!rawEventAccepted) {
      return jsonResponse({ received: true, duplicate: true }, 200);
    }

    if (!mpToken) {
      slog(rid, 'error', 'No MP access token configured');
      return jsonResponse({ error: 'Gateway not configured' }, 500);
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mpToken}`,
      },
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      slog(rid, 'error', 'Failed to fetch MP payment', { payment_id: paymentId, mp_error: mpData?.message });
      return jsonResponse({ error: 'Failed to verify payment' }, 500);
    }

    const statusKey = `status:${paymentId}:${String(mpData.status || 'unknown')}`;
    const statusAccepted = await registerWebhookEvent(supabaseAdmin, statusKey);
    if (!statusAccepted) {
      return jsonResponse({ received: true, duplicate: true }, 200);
    }

    const orderId = String(mpData.external_reference || mpData.metadata?.order_id || '');
    if (!orderId) {
      return jsonResponse({ error: 'No order reference' }, 400);
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, payment_status, total')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    if (mpData.currency_id && mpData.currency_id !== 'BRL') {
      await auditLog(supabaseAdmin, 'webhook_invalid_currency', {
        order_id: orderId,
        expected: 'BRL',
        received: mpData.currency_id,
      }, rid, clientIp);
      return jsonResponse({ error: 'Invalid currency' }, 400);
    }

    if (mpData.transaction_amount && Math.abs(Number(mpData.transaction_amount) - Number(order.total)) > 0.05) {
      await auditLog(supabaseAdmin, 'webhook_amount_mismatch', {
        order_id: orderId,
        expected: Number(order.total),
        received: Number(mpData.transaction_amount),
      }, rid, clientIp);
    }

    const statusMap: Record<string, { payment: string; order: string | null }> = {
      approved: { payment: 'approved', order: 'confirmado' },
      rejected: { payment: 'rejected', order: 'cancelado' },
      cancelled: { payment: 'cancelled', order: 'cancelado' },
      refunded: { payment: 'refunded', order: 'cancelado' },
      charged_back: { payment: 'refunded', order: 'cancelado' },
      pending: { payment: 'pending', order: null },
      in_process: { payment: 'pending', order: null },
      authorized: { payment: 'pending', order: null },
    };

    const mapped = statusMap[String(mpData.status || '').toLowerCase()] || {
      payment: String(mpData.status || 'pending').toLowerCase(),
      order: null,
    };

    const updatePayload: Record<string, unknown> = {
      payment_status: mapped.payment,
      payment_details: mpData,
      payment_id: String(mpData.id),
    };

    if (mapped.order && mapped.order !== order.status) {
      updatePayload.status = mapped.order;
      await supabaseAdmin.from('order_status_history').insert({
        order_id: orderId,
        from_status: order.status,
        to_status: mapped.order,
        note: `Webhook MP: ${mpData.status} (payment ${mpData.id})`,
      });
    }

    await supabaseAdmin.from('orders').update(updatePayload).eq('id', orderId);

    slog(rid, 'info', 'Webhook processed', {
      order_id: orderId,
      payment_id: paymentId,
      mp_status: mpData.status,
    });

    return jsonResponse({ received: true }, 200);
  } catch (error) {
    slog(rid, 'error', 'Unhandled webhook error', { error: String(error) });
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
