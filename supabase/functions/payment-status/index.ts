import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function generateRequestId(): string {
  return crypto.randomUUID();
}

function validateUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
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

function unknownStatusResponse(status = 200): Response {
  return jsonResponse({
    payment_status: 'unknown',
    order_status: 'unknown',
    payment_method: 'unknown',
  }, status);
}

function slog(rid: string, level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) {
  const payload = { request_id: rid, level, msg, ...extra };
  if (level === 'error') {
    console.error(JSON.stringify(payload));
    return;
  }
  console.log(JSON.stringify(payload));
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

async function generateTrackingToken(orderId: string): Promise<string> {
  const secret = Deno.env.get('ORDER_TRACKING_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(orderId));
  const hex = Array.from(new Uint8Array(sig)).map(x => x.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 24);
}

async function timingSafeEquals(a: string, b: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('tracking-token-compare'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const hashA = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(a));
  const hashB = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(b));
  const bytesA = new Uint8Array(hashA);
  const bytesB = new Uint8Array(hashB);
  if (bytesA.length !== bytesB.length) return false;
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rid = generateRequestId();

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get('order_id') || '';
    const trackingToken = (url.searchParams.get('tracking_token') || '').trim();
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    if (!orderId || !validateUUID(orderId) || !trackingToken) {
      return unknownStatusResponse();
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const allowed = await consumeRateLimit(supabaseAdmin, `payment-status:ip:${clientIp}`, 60, 40);
    if (!allowed) {
      slog(rid, 'warn', 'Rate limited', { ip: clientIp });
      return unknownStatusResponse(429);
    }

    const expectedToken = await generateTrackingToken(orderId);
    const tokenValid = await timingSafeEquals(trackingToken, expectedToken);
    if (!tokenValid) {
      return unknownStatusResponse();
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('payment_status, status, payment_method, payment_id')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      return unknownStatusResponse();
    }

    if (order.payment_status === 'pending' && order.payment_id) {
      try {
        const { data: settings } = await supabaseAdmin
          .from('store_settings')
          .select('value')
          .eq('key', 'mercado_pago')
          .single();

        const mpToken = (settings?.value as any)?.access_token || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
        if (mpToken) {
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${order.payment_id}`, {
            headers: {
              Authorization: `Bearer ${mpToken}`,
            },
          });

          if (mpRes.ok) {
            const mpData = await mpRes.json();
            const mpStatus = String(mpData.status || '').toLowerCase();

            if (mpStatus === 'approved') {
              await supabaseAdmin
                .from('orders')
                .update({
                  payment_status: 'approved',
                  status: 'confirmado',
                  payment_details: mpData,
                })
                .eq('id', orderId);

              await supabaseAdmin.from('order_status_history').insert({
                order_id: orderId,
                from_status: order.status,
                to_status: 'confirmado',
                note: 'Pagamento aprovado (verificacao ativa)',
              });

              return jsonResponse({
                payment_status: 'approved',
                order_status: 'confirmado',
                payment_method: order.payment_method,
              });
            }

            if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
              await supabaseAdmin
                .from('orders')
                .update({ payment_status: mpStatus })
                .eq('id', orderId);

              return jsonResponse({
                payment_status: mpStatus,
                order_status: order.status,
                payment_method: order.payment_method,
              });
            }
          }
        }
      } catch (mpError) {
        slog(rid, 'error', 'MP active check failed', { error: String(mpError), order_id: orderId });
      }
    }

    return jsonResponse({
      payment_status: order.payment_status,
      order_status: order.status,
      payment_method: order.payment_method,
    });
  } catch (error) {
    slog(rid, 'error', 'Unhandled payment-status error', { error: String(error) });
    return unknownStatusResponse(500);
  }
});
