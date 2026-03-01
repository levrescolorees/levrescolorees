import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
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

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const orderNumber = Number(body?.order_number || 0);
    const email = String(body?.email || '').trim().toLowerCase();
    const cpfLast4 = String(body?.cpf_last4 || '').replace(/\D/g, '').slice(0, 4);

    if (!Number.isInteger(orderNumber) || orderNumber < 1) {
      return jsonResponse({ error: 'Invalid order number' }, 400);
    }

    if (!email && cpfLast4.length !== 4) {
      return jsonResponse({ error: 'Email or cpf_last4 required' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const allowed = await consumeRateLimit(supabaseAdmin, `order-tracking:ip:${clientIp}`, 60, 40);
    if (!allowed) {
      return jsonResponse({ error: 'Rate limited' }, 429);
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, status, total, payment_method, tracking_code, created_at, shipping_address, customer_id')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (orderError || !order) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('email, cpf')
      .eq('id', order.customer_id)
      .maybeSingle();

    if (customerError || !customer) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    const customerEmail = String(customer.email || '').trim().toLowerCase();
    const customerCpfLast4 = String(customer.cpf || '').replace(/\D/g, '').slice(-4);

    const emailMatches = email ? customerEmail === email : false;
    const cpfMatches = cpfLast4 ? customerCpfLast4 === cpfLast4 : false;

    if (!emailMatches && !cpfMatches) {
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    const [{ data: items }, { data: history }] = await Promise.all([
      supabaseAdmin
        .from('order_items')
        .select('product_name, variant_name, quantity, unit_price')
        .eq('order_id', order.id),
      supabaseAdmin
        .from('order_status_history')
        .select('to_status, created_at, note')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true }),
    ]);

    const shippingAddress = (order.shipping_address || {}) as Record<string, string>;
    const sanitizedShippingAddress = {
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      zip: shippingAddress.zip || '',
    };

    return jsonResponse({
      order: {
        order_number: order.order_number,
        status: order.status,
        total: order.total,
        payment_method: order.payment_method,
        tracking_code: order.tracking_code,
        created_at: order.created_at,
        shipping_address: sanitizedShippingAddress,
        items: items || [],
        history: history || [],
      },
    });
  } catch {
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
