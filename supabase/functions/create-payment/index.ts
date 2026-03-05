import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type JsonRecord = Record<string, unknown>;

type PaymentPayload = {
  items: Array<{
    product_id: string;
    variant_id?: string | null;
    variant_name?: string | null;
    quantity: number;
  }>;
  customer: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    cnpj?: string | null;
    company_name?: string | null;
    is_reseller?: boolean;
  };
  shipping_address: {
    zip: string;
    street: string;
    number: string;
    complement?: string | null;
    neighborhood?: string | null;
    city: string;
    state: string;
  };
  payment_method: 'pix' | 'card' | 'boleto';
  shipping_cost?: number;
  coupon_code?: string | null;
  card_token?: string | null;
  installments?: number;
};

const VALID_UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

function generateRequestId(): string {
  return crypto.randomUUID();
}

function sanitizeString(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

function validateUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  return rem === Number(digits[10]);
}

function maskEmail(email: string): string {
  if (!email.includes('@')) return '***';
  const [user, domain] = email.split('@');
  const safeUser = user ? `${user[0]}***` : '***';
  const domainParts = domain.split('.');
  const safeDomain = domainParts.length > 1
    ? `${domainParts[0][0] || '*'}***.${domainParts.slice(1).join('.')}`
    : '***';
  return `${safeUser}@${safeDomain}`;
}

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(headers || {}),
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

function assertPlainObject(value: unknown, label: string): asserts value is JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} invalido`);
  }
}

function assertAllowedKeys(value: JsonRecord, allowed: string[], label: string) {
  const unknownKeys = Object.keys(value).filter(key => !allowed.includes(key));
  if (unknownKeys.length > 0) {
    throw new Error(`${label} contem campos nao permitidos`);
  }
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
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

async function consumeRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  identifier: string,
  windowSeconds: number,
  limit: number,
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const { data, error } = await (supabaseAdmin as any).rpc('consume_rate_limit', {
    p_identifier: identifier,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });

  if (error || !data) {
    return { allowed: true, count: 0, limit };
  }

  return {
    allowed: !!data.allowed,
    count: Number(data.count || 0),
    limit: Number(data.limit || limit),
  };
}

async function registerIdempotency(
  supabaseAdmin: ReturnType<typeof createClient>,
  idempotencyKey: string,
  requestFingerprint: string,
): Promise<{ type: 'ok' } | { type: 'replay'; response: unknown } | { type: 'processing' } | { type: 'mismatch' }> {
  const { data: existing } = await supabaseAdmin
    .from('checkout_idempotency')
    .select('request_fingerprint, status, response_payload, expires_at')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existing) {
    if (existing.request_fingerprint !== requestFingerprint) {
      return { type: 'mismatch' };
    }

    const expired = existing.expires_at ? new Date(existing.expires_at).getTime() < Date.now() : false;
    if (expired) {
      await supabaseAdmin.from('checkout_idempotency').delete().eq('idempotency_key', idempotencyKey);
    } else if (existing.status === 'completed' && existing.response_payload) {
      return { type: 'replay', response: existing.response_payload };
    } else {
      return { type: 'processing' };
    }
  }

  const { error } = await supabaseAdmin.from('checkout_idempotency').insert({
    idempotency_key: idempotencyKey,
    request_fingerprint: requestFingerprint,
    status: 'processing',
  });

  if (!error) return { type: 'ok' };

  if (!String(error.message || '').toLowerCase().includes('duplicate')) {
    throw error;
  }

  const { data: afterConflict } = await supabaseAdmin
    .from('checkout_idempotency')
    .select('request_fingerprint, status, response_payload')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (!afterConflict) return { type: 'processing' };
  if (afterConflict.request_fingerprint !== requestFingerprint) return { type: 'mismatch' };
  if (afterConflict.status === 'completed' && afterConflict.response_payload) {
    return { type: 'replay', response: afterConflict.response_payload };
  }
  return { type: 'processing' };
}

async function finishIdempotency(
  supabaseAdmin: ReturnType<typeof createClient>,
  idempotencyKey: string,
  status: 'completed' | 'failed',
  responsePayload: unknown,
  orderId?: string,
) {
  await supabaseAdmin
    .from('checkout_idempotency')
    .update({
      status,
      order_id: orderId || null,
      response_payload: responsePayload,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .eq('idempotency_key', idempotencyKey);
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
      entity_type: 'payment',
      request_id: requestId,
      ip_address: ip,
      details,
    });
  } catch {
    // no-op
  }
}

function parsePayload(raw: unknown): PaymentPayload {
  assertPlainObject(raw, 'payload');
  assertAllowedKeys(raw, ['items', 'customer', 'shipping_address', 'payment_method', 'coupon_code', 'card_token', 'installments'], 'payload');

  assertPlainObject(raw.customer, 'customer');
  assertAllowedKeys(raw.customer, ['name', 'email', 'phone', 'cpf', 'cnpj', 'company_name', 'is_reseller'], 'customer');

  assertPlainObject(raw.shipping_address, 'shipping_address');
  assertAllowedKeys(raw.shipping_address, ['zip', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'], 'shipping_address');

  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    throw new Error('Itens obrigatorios');
  }

  for (const item of raw.items) {
    assertPlainObject(item, 'item');
    assertAllowedKeys(item, ['product_id', 'variant_id', 'variant_name', 'quantity'], 'item');
  }

  return raw as PaymentPayload;
}

async function getMpConfig(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data } = await supabaseAdmin
    .from('store_settings')
    .select('value')
    .eq('key', 'mercado_pago')
    .single();

  if (!data?.value) return null;

  const value = data.value as any;
  return {
    access_token: value.access_token || '',
    enabled: value.enabled ?? false,
    pix_enabled: value.pix_enabled ?? true,
    card_enabled: value.card_enabled ?? true,
    boleto_enabled: value.boleto_enabled ?? true,
    max_installments: Number(value.max_installments || 12),
  };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Metodo nao permitido' }, 405);
  }

  const rid = generateRequestId();
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const idempotencyKey = req.headers.get('x-idempotency-key')?.trim() || '';
  let idempotencyReserved = false;

  try {
    const contentLength = Number(req.headers.get('content-length') || '0');
    if (contentLength > 60_000) {
      return jsonResponse({ error: 'Payload muito grande' }, 413);
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return jsonResponse({ error: 'Content-Type invalido' }, 415);
    }

    if (!/^[A-Za-z0-9:_-]{16,128}$/.test(idempotencyKey)) {
      return jsonResponse({ error: 'x-idempotency-key obrigatorio e invalido' }, 400);
    }

    const rawBody = await req.json();
    const payload = parsePayload(rawBody);

    const cleanName = sanitizeString(payload.customer.name, 120);
    const cleanEmail = sanitizeString(payload.customer.email, 254).toLowerCase();
    const cleanPhone = String(payload.customer.phone || '').replace(/\D/g, '').slice(0, 11);
    const cleanCpf = String(payload.customer.cpf || '').replace(/\D/g, '').slice(0, 11);

    if (!cleanName || !validateEmail(cleanEmail) || !cleanPhone || !validateCPF(cleanCpf)) {
      return jsonResponse({ error: 'Dados do cliente invalidos' }, 400);
    }

    const cleanZip = String(payload.shipping_address.zip || '').replace(/\D/g, '').slice(0, 8);
    const cleanStreet = sanitizeString(payload.shipping_address.street, 200);
    const cleanNumber = sanitizeString(payload.shipping_address.number, 20);
    const cleanComplement = sanitizeString(payload.shipping_address.complement || '', 100);
    const cleanNeighborhood = sanitizeString(payload.shipping_address.neighborhood || '', 100);
    const cleanCity = sanitizeString(payload.shipping_address.city, 100);
    const cleanState = sanitizeString(payload.shipping_address.state, 2).toUpperCase();

    if (!/^\d{8}$/.test(cleanZip) || !cleanStreet || !cleanNumber || !cleanCity || !VALID_UFS.has(cleanState)) {
      return jsonResponse({ error: 'Endereco invalido' }, 400);
    }

    if (!['pix', 'card', 'boleto'].includes(payload.payment_method)) {
      return jsonResponse({ error: 'Metodo de pagamento invalido' }, 400);
    }

    if (payload.payment_method === 'card' && !sanitizeString(payload.card_token || '', 220)) {
      return jsonResponse({ error: 'card_token obrigatorio para cartao' }, 400);
    }

    if (payload.coupon_code && !/^[A-Za-z0-9_-]{1,40}$/.test(payload.coupon_code)) {
      return jsonResponse({ error: 'Cupom invalido' }, 400);
    }

    for (const item of payload.items) {
      if (!item.product_id || !validateUUID(item.product_id)) {
        return jsonResponse({ error: 'Produto invalido' }, 400);
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
        return jsonResponse({ error: 'Quantidade invalida (1-100)' }, 400);
      }
      if (item.variant_id && !validateUUID(item.variant_id)) {
        return jsonResponse({ error: 'Variante invalida' }, 400);
      }
    }

    const requestFingerprint = await sha256Hex(JSON.stringify(payload));
    const idempotencyStatus = await registerIdempotency(supabaseAdmin, idempotencyKey, requestFingerprint);
    if (idempotencyStatus.type === 'mismatch') {
      return jsonResponse({ error: 'Chave de idempotencia reutilizada com payload diferente' }, 409);
    }
    if (idempotencyStatus.type === 'processing') {
      return jsonResponse({ error: 'Requisicao em processamento para esta chave' }, 409);
    }
    if (idempotencyStatus.type === 'replay') {
      return jsonResponse(idempotencyStatus.response, 200, { 'x-idempotent-replay': 'true' });
    }
    idempotencyReserved = true;

    const ipRate = await consumeRateLimit(supabaseAdmin, `checkout:ip:${clientIp}`, 60, 30);
    if (!ipRate.allowed) {
      await auditLog(supabaseAdmin, 'checkout_rate_limited', { type: 'ip', ip: clientIp, count: ipRate.count }, rid, clientIp);
      const response = { error: 'Muitas tentativas. Aguarde um momento.' };
      await finishIdempotency(supabaseAdmin, idempotencyKey, 'failed', response);
      return jsonResponse(response, 429);
    }

    const emailRate = await consumeRateLimit(supabaseAdmin, `checkout:email:${cleanEmail}`, 3600, 6);
    if (!emailRate.allowed) {
      await auditLog(supabaseAdmin, 'checkout_rate_limited', { type: 'email', email: maskEmail(cleanEmail), count: emailRate.count }, rid, clientIp);
      const response = { error: 'Muitos pedidos recentes. Aguarde antes de tentar novamente.' };
      await finishIdempotency(supabaseAdmin, idempotencyKey, 'failed', response);
      return jsonResponse(response, 429);
    }

    const mpConfig = await getMpConfig(supabaseAdmin);
    const mpToken = mpConfig?.access_token || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
    const mpEnabled = mpConfig?.enabled ?? !!mpToken;

    if (mpEnabled) {
      if (payload.payment_method === 'pix' && !mpConfig?.pix_enabled) {
        const response = { error: 'Pix nao esta habilitado' };
        await finishIdempotency(supabaseAdmin, idempotencyKey, 'failed', response);
        return jsonResponse(response, 400);
      }
      if (payload.payment_method === 'card' && !mpConfig?.card_enabled) {
        const response = { error: 'Cartao nao esta habilitado' };
        await finishIdempotency(supabaseAdmin, idempotencyKey, 'failed', response);
        return jsonResponse(response, 400);
      }
      if (payload.payment_method === 'boleto' && !mpConfig?.boleto_enabled) {
        const response = { error: 'Boleto nao esta habilitado' };
        await finishIdempotency(supabaseAdmin, idempotencyKey, 'failed', response);
        return jsonResponse(response, 400);
      }
    }

    const productIds = [...new Set(payload.items.map(item => item.product_id))];
    const { data: dbProducts, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, retail_price, stock, is_active, name')
      .in('id', productIds);

    if (productsError || !dbProducts) {
      slog(rid, 'error', 'Failed to validate products', { error: productsError?.message });
      const response = { error: 'Erro ao validar produtos' };
      await finishIdempotency(supabaseAdmin, idempotencyKey, 'failed', response);
      return jsonResponse(response, 500);
    }

    const { data: priceRules } = await supabaseAdmin
      .from('price_rules')
      .select('*')
      .in('product_id', productIds)
      .eq('is_active', true)
      .order('min_quantity', { ascending: false });

    const productMap = new Map(dbProducts.map(product => [product.id, product]));

    let subtotal = 0;
    const validatedItems: Array<{
      product_id: string;
      variant_id: string | null;
      product_name: string;
      variant_name: string | null;
      quantity: number;
      unit_price: number;
    }> = [];

    for (const item of payload.items) {
      const product = productMap.get(item.product_id);
      if (!product || !product.is_active) {
        const response = { error: 'Produto indisponivel' };
        await finishIdempotency(supabaseAdmin, idempotencyKey, 'failed', response);
        return jsonResponse(response, 400);
      }

      if (product.stock < item.quantity) {
        const response = { error: `Estoque insuficiente para ${product.name}` };
        await finishIdempotency(supabaseAdmin, idempotencyKey, 'failed', response);
        return jsonResponse(response, 400);
      }

      let unitPrice = Number(product.retail_price);
      const rules = (priceRules || []).filter(rule => rule.product_id === item.product_id);
      for (const rule of rules) {
        if (item.quantity >= rule.min_quantity) {
          unitPrice = Number(rule.price);
          break;
        }
      }

      validatedItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: String(product.name),
        variant_name: sanitizeString(item.variant_name || '', 80) || null,
        quantity: Number(item.quantity),
        unit_price: unitPrice,
      });

      subtotal += unitPrice * Number(item.quantity);
    }

    let couponDiscount = 0;
    let couponId: string | null = null;
    if (payload.coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', payload.coupon_code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (coupon) {
        const now = new Date();
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > now;
        const notExhausted = !coupon.max_uses || coupon.used_count < coupon.max_uses;
        const meetsMinimum = subtotal >= Number(coupon.min_order_value || 0);
        if (notExpired && notExhausted && meetsMinimum) {
          couponDiscount = coupon.discount_type === 'percentage'
            ? subtotal * (Number(coupon.discount_value) / 100)
            : Number(coupon.discount_value);
          couponId = coupon.id;
        }
      }
    }

    const { data: shippingRules } = await supabaseAdmin
      .from('shipping_rules')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    let shipping = 19.9;
    if (typeof payload.shipping_cost === 'number' && payload.shipping_cost >= 0 && payload.shipping_cost <= 500) {
      shipping = payload.shipping_cost;
    } else if (shippingRules?.length) {
      const freeRule = shippingRules.find(rule => rule.rule_type === 'free_above');
      if (freeRule?.min_order_for_free && subtotal >= Number(freeRule.min_order_for_free)) {
        shipping = 0;
      } else {
        const stateRule = shippingRules.find(rule => rule.rule_type === 'by_state' && rule.state?.toUpperCase() === cleanState);
        if (stateRule) {
          shipping = Number(stateRule.value);
        } else {
          const fixedRule = shippingRules.find(rule => rule.rule_type === 'fixed');
          if (fixedRule) shipping = Number(fixedRule.value);
          else if (freeRule) shipping = Number(freeRule.value);
        }
      }
    } else if (subtotal >= 299) {
      shipping = 0;
    }

    const afterCoupon = subtotal - couponDiscount + shipping;
    const pixDiscount = payload.payment_method === 'pix' ? afterCoupon * 0.05 : 0;
    const totalDiscount = couponDiscount + pixDiscount;
    const total = afterCoupon - pixDiscount;

    if (payload.payment_method === 'card') {
      const inst = Number(payload.installments || 1);
      const maxInstallments = Math.max(1, Number(mpConfig?.max_installments || 12));
      if (!Number.isInteger(inst) || inst < 1 || inst > maxInstallments) {
        const response = { error: `Parcelas invalidas (1-${maxInstallments})` };
        await finishIdempotency(supabaseAdmin, idempotencyKey, 'failed', response);
        return jsonResponse(response, 400);
      }
    }

    let customerId: string;
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      await supabaseAdmin
        .from('customers')
        .update({
          name: cleanName,
          phone: cleanPhone,
          cpf: cleanCpf,
          cnpj: String(payload.customer.cnpj || '').replace(/\D/g, '') || null,
          company_name: sanitizeString(payload.customer.company_name || '', 120) || null,
          is_reseller: !!payload.customer.is_reseller,
        })
        .eq('id', customerId);
    } else {
      const { data: newCustomer, error: customerError } = await supabaseAdmin
        .from('customers')
        .insert({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          cpf: cleanCpf,
          cnpj: String(payload.customer.cnpj || '').replace(/\D/g, '') || null,
          company_name: sanitizeString(payload.customer.company_name || '', 120) || null,
          is_reseller: !!payload.customer.is_reseller,
        })
        .select('id')
        .single();

      if (customerError || !newCustomer) {
        throw customerError || new Error('Falha ao criar cliente');
      }
      customerId = newCustomer.id;
    }

    const shippingAddress = {
      zip: cleanZip,
      street: cleanStreet,
      number: cleanNumber,
      complement: cleanComplement,
      neighborhood: cleanNeighborhood,
      city: cleanCity,
      state: cleanState,
    };

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_id: customerId,
        subtotal,
        shipping,
        discount: totalDiscount,
        total,
        payment_method: payload.payment_method,
        payment_status: 'pending',
        shipping_address: shippingAddress as any,
        status: 'pendente',
      })
      .select('id, order_number')
      .single();

    if (orderError || !order) {
      throw orderError || new Error('Falha ao criar pedido');
    }

    const orderItems = validatedItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.product_name,
      variant_name: item.variant_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
    }));

    await supabaseAdmin.from('order_items').insert(orderItems);
    await supabaseAdmin.from('order_status_history').insert({
      order_id: order.id,
      to_status: 'pendente',
      note: 'Pedido criado via checkout',
    });

    if (couponId) {
      const { data: couponData } = await supabaseAdmin
        .from('coupons')
        .select('used_count')
        .eq('id', couponId)
        .single();

      if (couponData) {
        await supabaseAdmin
          .from('coupons')
          .update({ used_count: Number(couponData.used_count || 0) + 1 })
          .eq('id', couponId);
      }
    }

    const trackingToken = await generateTrackingToken(order.id);

    if (!mpToken || !mpEnabled) {
      // Email is now handled by database trigger → email_outbox → email-worker

      const response = {
        order_id: order.id,
        order_number: order.order_number,
        payment_status: 'pending',
        payment_method: payload.payment_method,
        total,
        tracking_token: trackingToken,
        message: 'Pedido criado. Configure o Mercado Pago em Integracoes para processar pagamentos.',
      };
      await finishIdempotency(supabaseAdmin, idempotencyKey, 'completed', response, order.id);
      return jsonResponse(response, 200);
    }

    const mpBody: Record<string, unknown> = {
      transaction_amount: Number(total.toFixed(2)),
      description: `Pedido #${order.order_number}`,
      external_reference: order.id,
      payer: {
        email: cleanEmail,
        first_name: cleanName.split(' ')[0],
        last_name: cleanName.split(' ').slice(1).join(' ') || cleanName,
        identification: { type: 'CPF', number: cleanCpf },
      },
      metadata: { order_id: order.id, order_number: order.order_number },
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
    };

    if (payload.payment_method === 'pix') {
      mpBody.payment_method_id = 'pix';
    } else if (payload.payment_method === 'card') {
      const installments = Number(payload.installments || 1);
      const maxInstallments = Number(mpConfig?.max_installments || 12);
      const safeInstallments = Math.min(installments, maxInstallments);

      mpBody.token = payload.card_token;
      mpBody.installments = safeInstallments;

      if (safeInstallments > 1) {
        const rate = safeInstallments <= 6 ? 0.0299 : 0.0349;
        const installmentTotal = total * (1 + rate * safeInstallments);
        mpBody.transaction_amount = Number(installmentTotal.toFixed(2));
      }
    } else if (payload.payment_method === 'boleto') {
      mpBody.payment_method_id = 'bolbradesco';
    }

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpBody),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      slog(rid, 'error', 'MP payment failed', {
        order_id: order.id,
        mp_status: mpData?.status,
        mp_message: mpData?.message,
      });

      await supabaseAdmin.from('orders').update({
        payment_status: 'rejected',
        payment_details: mpData,
      }).eq('id', order.id);

      const response = {
        error: 'Erro no processamento do pagamento',
        details: mpData?.message || 'Tente novamente',
        order_id: order.id,
      };
      await finishIdempotency(supabaseAdmin, idempotencyKey, 'failed', response, order.id);
      return jsonResponse(response, 400);
    }

    const paymentStatus = mpData.status === 'approved' ? 'approved' : 'pending';
    await supabaseAdmin
      .from('orders')
      .update({
        payment_id: String(mpData.id),
        payment_status: paymentStatus,
        payment_details: mpData,
        status: paymentStatus === 'approved' ? 'confirmado' : 'pendente',
      })
      .eq('id', order.id);

    if (paymentStatus === 'approved') {
      await supabaseAdmin.from('order_status_history').insert({
        order_id: order.id,
        from_status: 'pendente',
        to_status: 'confirmado',
        note: 'Pagamento aprovado automaticamente',
      });

      // Email is now handled by database trigger → email_outbox → email-worker
    }

    const response: Record<string, unknown> = {
      order_id: order.id,
      order_number: order.order_number,
      payment_status: paymentStatus,
      payment_method: payload.payment_method,
      total: mpBody.transaction_amount,
      tracking_token: trackingToken,
    };

    if (payload.payment_method === 'pix') {
      const txData = (mpData.point_of_interaction || {}).transaction_data || {};
      response.pix = {
        qr_code: txData.qr_code,
        qr_code_base64: txData.qr_code_base64,
        ticket_url: txData.ticket_url,
        expiration: mpData.date_of_expiration,
      };
    } else if (payload.payment_method === 'boleto') {
      response.boleto = {
        barcode: mpData?.barcode?.content,
        external_resource_url: mpData?.transaction_details?.external_resource_url,
        expiration: mpData?.date_of_expiration,
      };
    } else if (payload.payment_method === 'card') {
      response.card = {
        last_four: mpData?.card?.last_four_digits,
        installments: mpData?.installments,
        installment_amount: mpData?.transaction_details?.installment_amount,
      };
    }

    await finishIdempotency(supabaseAdmin, idempotencyKey, 'completed', response, order.id);
    slog(rid, 'info', 'Payment processed', { order_id: order.id, status: paymentStatus });

    return jsonResponse(response, 200);
  } catch (error) {
    const errorDetail = error instanceof Error
      ? error.message
      : (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error));
    slog(rid, 'error', 'Unhandled create-payment error', {
      error: errorDetail,
      ip: clientIp,
      idempotency_key: idempotencyKey || null,
    });

    if (idempotencyReserved && idempotencyKey) {
      await finishIdempotency(
        supabaseAdmin,
        idempotencyKey,
        'failed',
        { error: 'Erro interno do servidor' },
      );
    }

    return jsonResponse({ error: 'Erro interno do servidor' }, 500);
  }
});
