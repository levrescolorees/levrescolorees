import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ========== SECURITY UTILITIES (inline) ==========

function generateRequestId(): string {
  return crypto.randomUUID()
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***'
  const [user, domain] = email.split('@')
  const domParts = domain.split('.')
  return `${user[0]}***@${domParts[0][0]}***.${domParts.slice(1).join('.')}`
}

function validateUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
  let rem = (sum * 10) % 11
  if (rem === 10) rem = 0
  if (rem !== parseInt(digits[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
  rem = (sum * 10) % 11
  if (rem === 10) rem = 0
  return rem === parseInt(digits[10])
}

function sanitizeString(str: string, maxLen: number): string {
  if (!str || typeof str !== 'string') return ''
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLen)
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

const VALID_UFS = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
])

// ========== RATE LIMITING ==========

const ipRateMap = new Map<string, { count: number; resetAt: number }>()
const emailRateMap = new Map<string, { count: number; resetAt: number }>()

function isIpRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipRateMap.get(ip)
  if (!entry || now > entry.resetAt) { ipRateMap.set(ip, { count: 1, resetAt: now + 60_000 }); return false }
  entry.count++
  return entry.count > 30
}

function isEmailRateLimited(email: string): boolean {
  const now = Date.now()
  const key = email.toLowerCase().trim()
  const entry = emailRateMap.get(key)
  if (!entry || now > entry.resetAt) { emailRateMap.set(key, { count: 1, resetAt: now + 3600_000 }); return false }
  entry.count++
  return entry.count > 5
}

// ========== DEDUP ==========

const dedupMap = new Map<string, number>()
function isDuplicate(email: string, total: number): boolean {
  const key = `${email.toLowerCase()}:${total.toFixed(2)}`
  const now = Date.now()
  const last = dedupMap.get(key)
  if (last && now - last < 5 * 60_000) return true
  dedupMap.set(key, now)
  return false
}

// ========== MP CONFIG ==========

async function getMpConfig(supabaseAdmin: any) {
  const { data } = await supabaseAdmin
    .from('store_settings').select('value').eq('key', 'mercado_pago').single()
  if (!data?.value) return null
  const v = data.value as any
  return {
    access_token: v.access_token || '',
    enabled: v.enabled ?? false,
    pix_enabled: v.pix_enabled ?? true,
    card_enabled: v.card_enabled ?? true,
    boleto_enabled: v.boleto_enabled ?? true,
    max_installments: v.max_installments || 12,
  }
}

// ========== STRUCTURED LOG ==========

function slog(rid: string, level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) {
  const payload = { request_id: rid, level, msg, ...extra }
  if (level === 'error') console.error(JSON.stringify(payload))
  else console.log(JSON.stringify(payload))
}

// ========== AUDIT LOG ==========

async function auditLog(
  supabaseAdmin: any,
  action: string,
  opts: { entity_type?: string; entity_id?: string; ip?: string; request_id?: string; details?: Record<string, unknown> }
) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action,
      entity_type: opts.entity_type || null,
      entity_id: opts.entity_id || null,
      ip_address: opts.ip || null,
      request_id: opts.request_id || null,
      details: opts.details || {},
    })
  } catch { /* never let audit logging break the flow */ }
}

// ========== HANDLER ==========

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const rid = generateRequestId()

  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    // --- Payload size check ---
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > 50_000) {
      slog(rid, 'warn', 'Payload too large', { ip: clientIp, size: contentLength })
      return new Response(JSON.stringify({ error: 'Payload muito grande' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Content-Type check ---
    const ct = req.headers.get('content-type') || ''
    if (!ct.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Content-Type inválido' }), {
        status: 415, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- IP rate limit ---
    if (isIpRateLimited(clientIp)) {
      slog(rid, 'warn', 'IP rate limited', { ip: clientIp })
      const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await auditLog(supabaseAdmin, 'rate_limit_triggered', {
        entity_type: 'payment', ip: clientIp, request_id: rid,
        details: { type: 'ip', ip: clientIp },
      })
      return new Response(JSON.stringify({ error: 'Muitas tentativas. Aguarde um momento.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { items, customer, shipping_address, payment_method, coupon_code, card_token, installments } = body

    // --- Validate required fields ---
    if (!items?.length || !customer?.name || !customer?.email || !customer?.phone || !customer?.cpf) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios faltando' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Sanitize customer fields ---
    const cleanName = sanitizeString(customer.name, 120)
    const cleanEmail = sanitizeString(customer.email, 254).toLowerCase()
    const cleanPhone = customer.phone.replace(/\D/g, '').slice(0, 11)
    const cleanCpf = customer.cpf.replace(/\D/g, '').slice(0, 11)

    if (!validateEmail(cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- CPF validation (real digit verifier) ---
    if (!validateCPF(cleanCpf)) {
      return new Response(JSON.stringify({ error: 'CPF inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Email rate limit ---
    if (isEmailRateLimited(cleanEmail)) {
      slog(rid, 'warn', 'Email rate limited', { email: maskEmail(cleanEmail) })
      const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await auditLog(supabaseAdmin, 'rate_limit_triggered', {
        entity_type: 'payment', ip: clientIp, request_id: rid,
        details: { type: 'email', email_masked: maskEmail(cleanEmail) },
      })
      return new Response(JSON.stringify({ error: 'Muitos pedidos recentes. Aguarde antes de tentar novamente.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Validate shipping address ---
    if (!shipping_address?.zip || !shipping_address?.street || !shipping_address?.number || !shipping_address?.city || !shipping_address?.state) {
      return new Response(JSON.stringify({ error: 'Endereço incompleto' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cleanStreet = sanitizeString(shipping_address.street, 200)
    const cleanCity = sanitizeString(shipping_address.city, 100)
    const cleanNeighborhood = sanitizeString(shipping_address.neighborhood || '', 100)
    const cleanNumber = sanitizeString(shipping_address.number, 20)
    const cleanComplement = sanitizeString(shipping_address.complement || '', 100)
    const cleanZip = shipping_address.zip.replace(/\D/g, '').slice(0, 8)
    const cleanState = shipping_address.state.toUpperCase().trim()

    if (cleanZip.length !== 8 || !/^\d{8}$/.test(cleanZip)) {
      return new Response(JSON.stringify({ error: 'CEP inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!VALID_UFS.has(cleanState)) {
      return new Response(JSON.stringify({ error: 'UF inválida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Validate payment method ---
    if (!['pix', 'card', 'boleto'].includes(payment_method)) {
      return new Response(JSON.stringify({ error: 'Método de pagamento inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (payment_method === 'card' && !card_token) {
      return new Response(JSON.stringify({ error: 'Token do cartão obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Validate coupon code format ---
    if (coupon_code && (!/^[a-zA-Z0-9]+$/.test(coupon_code) || coupon_code.length > 30)) {
      return new Response(JSON.stringify({ error: 'Código de cupom inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Validate items ---
    for (const item of items) {
      if (!item.product_id || !validateUUID(item.product_id)) {
        return new Response(JSON.stringify({ error: 'ID de produto inválido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const qty = Number(item.quantity)
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
        return new Response(JSON.stringify({ error: 'Quantidade inválida (1-100)' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (item.variant_id && !validateUUID(item.variant_id)) {
        return new Response(JSON.stringify({ error: 'ID de variante inválido' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    slog(rid, 'info', 'Processing payment request', {
      ip: clientIp, email: maskEmail(cleanEmail), method: payment_method, item_count: items.length,
    })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // --- Get MP config ---
    const mpConfig = await getMpConfig(supabaseAdmin)
    const mpToken = mpConfig?.access_token || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || ''
    const mpEnabled = mpConfig?.enabled ?? !!mpToken

    // --- Validate items against DB & recalculate total ---
    const productIds = [...new Set(items.map((i: any) => i.product_id))]
    const { data: dbProducts, error: pErr } = await supabaseAdmin
      .from('products')
      .select('id, retail_price, stock, is_active, name')
      .in('id', productIds)

    if (pErr || !dbProducts) {
      slog(rid, 'error', 'Failed to validate products', { error: pErr?.message })
      return new Response(JSON.stringify({ error: 'Erro ao validar produtos' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: priceRules } = await supabaseAdmin
      .from('price_rules').select('*')
      .in('product_id', productIds).eq('is_active', true)
      .order('min_quantity', { ascending: false })

    const productMap = new Map(dbProducts.map(p => [p.id, p]))

    let subtotal = 0
    const validatedItems: Array<{
      product_id: string; variant_id: string | null; product_name: string;
      variant_name: string | null; quantity: number; unit_price: number;
    }> = []

    for (const item of items) {
      const product = productMap.get(item.product_id)
      if (!product || !product.is_active) {
        return new Response(JSON.stringify({ error: `Produto indisponível` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (product.stock < item.quantity) {
        return new Response(JSON.stringify({ error: `Estoque insuficiente para "${product.name}"` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let unitPrice = product.retail_price
      const rules = (priceRules || []).filter(r => r.product_id === item.product_id)
      for (const rule of rules) {
        if (item.quantity >= rule.min_quantity) { unitPrice = rule.price; break }
      }

      validatedItems.push({
        product_id: item.product_id, variant_id: item.variant_id || null,
        product_name: product.name, variant_name: item.variant_name || null,
        quantity: item.quantity, unit_price: unitPrice,
      })
      subtotal += unitPrice * item.quantity
    }

    // --- Validate coupon ---
    let couponDiscount = 0
    let couponId: string | null = null
    if (coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from('coupons').select('*')
        .eq('code', coupon_code.toUpperCase().trim())
        .eq('is_active', true).single()

      if (coupon) {
        const now = new Date()
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > now
        const notExhausted = !coupon.max_uses || coupon.used_count < coupon.max_uses
        const meetsMinimum = subtotal >= coupon.min_order_value
        if (notExpired && notExhausted && meetsMinimum) {
          couponDiscount = coupon.discount_type === 'percentage'
            ? subtotal * (coupon.discount_value / 100) : coupon.discount_value
          couponId = coupon.id
        }
      }
    }

    // --- Calculate shipping ---
    const { data: shippingRules } = await supabaseAdmin
      .from('shipping_rules').select('*').eq('is_active', true).order('sort_order')

    let shipping = 19.90
    if (shippingRules?.length) {
      const freeRule = shippingRules.find(r => r.rule_type === 'free_above')
      if (freeRule?.min_order_for_free && subtotal >= freeRule.min_order_for_free) {
        shipping = 0
      } else {
        const stateRule = shippingRules.find(r => r.rule_type === 'by_state' && r.state?.toUpperCase() === cleanState)
        if (stateRule) shipping = stateRule.value
        else {
          const fixedRule = shippingRules.find(r => r.rule_type === 'fixed')
          if (fixedRule) shipping = fixedRule.value
          else if (freeRule) shipping = freeRule.value
        }
      }
    } else if (subtotal >= 299) { shipping = 0 }

    // --- Pix discount & total ---
    const afterCoupon = subtotal - couponDiscount + shipping
    const pixDiscount = payment_method === 'pix' ? afterCoupon * 0.05 : 0
    const totalDiscount = couponDiscount + pixDiscount
    const total = afterCoupon - pixDiscount

    // --- Anti-duplicate ---
    if (isDuplicate(cleanEmail, total)) {
      slog(rid, 'warn', 'Duplicate payment attempt', { email: maskEmail(cleanEmail) })
      return new Response(JSON.stringify({ error: 'Pedido duplicado detectado. Aguarde alguns minutos.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Validate installments ---
    if (payment_method === 'card' && installments) {
      const inst = Number(installments)
      const maxInst = mpConfig?.max_installments || 12
      if (!Number.isInteger(inst) || inst < 1 || inst > maxInst) {
        return new Response(JSON.stringify({ error: `Parcelas inválidas (1-${maxInst})` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // --- Find or create customer ---
    let customerId: string
    const { data: existing } = await supabaseAdmin
      .from('customers').select('id').eq('email', cleanEmail).maybeSingle()

    if (existing) {
      customerId = existing.id
      await supabaseAdmin.from('customers').update({
        name: cleanName, phone: cleanPhone, cpf: cleanCpf,
        cnpj: customer.cnpj?.replace(/\D/g, '') || null,
        company_name: sanitizeString(customer.company_name || '', 120) || null,
        is_reseller: customer.is_reseller || false,
      }).eq('id', customerId)
    } else {
      const { data: newC, error: cErr } = await supabaseAdmin
        .from('customers').insert({
          name: cleanName, email: cleanEmail, phone: cleanPhone,
          cpf: cleanCpf, cnpj: customer.cnpj?.replace(/\D/g, '') || null,
          company_name: sanitizeString(customer.company_name || '', 120) || null,
          is_reseller: customer.is_reseller || false,
        }).select().single()
      if (cErr) throw cErr
      customerId = newC.id
    }

    // --- Create order ---
    const sanitizedAddress = {
      zip: cleanZip, street: cleanStreet, number: cleanNumber,
      complement: cleanComplement, neighborhood: cleanNeighborhood,
      city: cleanCity, state: cleanState,
    }

    const { data: order, error: oErr } = await supabaseAdmin
      .from('orders').insert({
        customer_id: customerId, subtotal, shipping, discount: totalDiscount, total,
        payment_method, payment_status: 'pending',
        shipping_address: sanitizedAddress as any, status: 'pendente',
      }).select().single()
    if (oErr) throw oErr

    // --- Create order items ---
    const orderItems = validatedItems.map(item => ({
      order_id: order.id, product_id: item.product_id, variant_id: item.variant_id,
      product_name: item.product_name, variant_name: item.variant_name,
      quantity: item.quantity, unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
    }))
    await supabaseAdmin.from('order_items').insert(orderItems)

    // --- Initial status history ---
    await supabaseAdmin.from('order_status_history').insert({
      order_id: order.id, to_status: 'pendente', note: 'Pedido criado via checkout',
    })

    // --- Increment coupon usage ---
    if (couponId) {
      const { data: couponData } = await supabaseAdmin.from('coupons').select('used_count').eq('id', couponId).single()
      if (couponData) {
        await supabaseAdmin.from('coupons').update({ used_count: couponData.used_count + 1 }).eq('id', couponId)
      }
    }

    slog(rid, 'info', 'Order created', { order_id: order.id, total, method: payment_method })

    // --- Call Mercado Pago ---
    if (!mpToken || !mpEnabled) {
      return new Response(JSON.stringify({
        order_id: order.id, order_number: order.order_number,
        payment_status: 'pending', payment_method, total,
        message: 'Pedido criado. Configure o Mercado Pago em Integrações para processar pagamentos.',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check if payment method is enabled
    if (payment_method === 'pix' && !mpConfig?.pix_enabled) {
      return new Response(JSON.stringify({ error: 'Pix não está habilitado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (payment_method === 'card' && !mpConfig?.card_enabled) {
      return new Response(JSON.stringify({ error: 'Cartão não está habilitado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (payment_method === 'boleto' && !mpConfig?.boleto_enabled) {
      return new Response(JSON.stringify({ error: 'Boleto não está habilitado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build MP payment body
    const mpBody: any = {
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
    }

    // Webhook URL
    mpBody.notification_url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`

    if (payment_method === 'pix') {
      mpBody.payment_method_id = 'pix'
    } else if (payment_method === 'card') {
      mpBody.token = card_token
      mpBody.installments = installments || 1
      if (installments && installments > 1) {
        const maxInst = mpConfig?.max_installments || 12
        const actualInst = Math.min(installments, maxInst)
        const rate = actualInst <= 6 ? 0.0299 : 0.0349
        const installmentTotal = total * (1 + rate * actualInst)
        mpBody.transaction_amount = Number(installmentTotal.toFixed(2))
        mpBody.installments = actualInst
      }
    } else if (payment_method === 'boleto') {
      mpBody.payment_method_id = 'bolbradesco'
    }

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': order.id,
      },
      body: JSON.stringify(mpBody),
    })

    const mpData = await mpRes.json()

    if (!mpRes.ok) {
      slog(rid, 'error', 'MP payment failed', { order_id: order.id, mp_status: mpData.status, mp_message: mpData.message })
      await supabaseAdmin.from('orders').update({
        payment_status: 'rejected', payment_details: mpData,
      }).eq('id', order.id)
      return new Response(JSON.stringify({
        error: 'Erro no processamento do pagamento',
        details: mpData.message || 'Tente novamente', order_id: order.id,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const paymentStatus = mpData.status === 'approved' ? 'approved' : 'pending'
    await supabaseAdmin.from('orders').update({
      payment_id: String(mpData.id), payment_status: paymentStatus,
      payment_details: mpData,
      status: paymentStatus === 'approved' ? 'confirmado' : 'pendente',
    }).eq('id', order.id)

    if (paymentStatus === 'approved') {
      await supabaseAdmin.from('order_status_history').insert({
        order_id: order.id, from_status: 'pendente', to_status: 'confirmado',
        note: 'Pagamento aprovado automaticamente',
      })
    }

    slog(rid, 'info', 'Payment processed', { order_id: order.id, mp_status: mpData.status })

    const response: any = {
      order_id: order.id, order_number: order.order_number,
      payment_status: paymentStatus, payment_method,
      total: mpBody.transaction_amount,
    }

    if (payment_method === 'pix') {
      const txData = mpData.point_of_interaction?.transaction_data
      response.pix = {
        qr_code: txData?.qr_code, qr_code_base64: txData?.qr_code_base64,
        ticket_url: txData?.ticket_url, expiration: mpData.date_of_expiration,
      }
    } else if (payment_method === 'boleto') {
      response.boleto = {
        barcode: mpData.barcode?.content,
        external_resource_url: mpData.transaction_details?.external_resource_url,
        expiration: mpData.date_of_expiration,
      }
    } else if (payment_method === 'card') {
      response.card = {
        last_four: mpData.card?.last_four_digits, installments: mpData.installments,
        installment_amount: mpData.transaction_details?.installment_amount,
      }
    }

    return new Response(JSON.stringify(response), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    slog(rid, 'error', 'Unhandled error', { error: String(err) })
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
