import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  entry.count++
  return entry.count > 10
}

// Simple dedup: same email + total in 5 min window
const dedupMap = new Map<string, number>()

function isDuplicate(email: string, total: number): boolean {
  const key = `${email}:${total}`
  const now = Date.now()
  const last = dedupMap.get(key)
  if (last && now - last < 5 * 60_000) return true
  dedupMap.set(key, now)
  return false
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(clientIp)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
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
    if (!validateEmail(customer.email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!shipping_address?.zip || !shipping_address?.street || !shipping_address?.number || !shipping_address?.city || !shipping_address?.state) {
      return new Response(JSON.stringify({ error: 'Endereço incompleto' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // --- Validate items against DB & recalculate total ---
    const productIds = [...new Set(items.map((i: any) => i.product_id))]
    const { data: dbProducts, error: pErr } = await supabaseAdmin
      .from('products')
      .select('id, retail_price, stock, is_active, name')
      .in('id', productIds)

    if (pErr || !dbProducts) {
      return new Response(JSON.stringify({ error: 'Erro ao validar produtos' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch price rules for quantity discounts
    const { data: priceRules } = await supabaseAdmin
      .from('price_rules')
      .select('*')
      .in('product_id', productIds)
      .eq('is_active', true)
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
        return new Response(JSON.stringify({ error: `Produto "${item.product_id}" indisponível` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (product.stock < item.quantity) {
        return new Response(JSON.stringify({ error: `Estoque insuficiente para "${product.name}"` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Find best price rule for this product + quantity
      let unitPrice = product.retail_price
      const rules = (priceRules || []).filter(r => r.product_id === item.product_id)
      for (const rule of rules) {
        if (item.quantity >= rule.min_quantity) {
          unitPrice = rule.price
          break // rules sorted desc by min_quantity, first match is best
        }
      }

      validatedItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_name: product.name,
        variant_name: item.variant_name || null,
        quantity: item.quantity,
        unit_price: unitPrice,
      })
      subtotal += unitPrice * item.quantity
    }

    // --- Validate coupon ---
    let couponDiscount = 0
    let couponId: string | null = null
    if (coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', coupon_code.toUpperCase().trim())
        .eq('is_active', true)
        .single()

      if (coupon) {
        const now = new Date()
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > now
        const notExhausted = !coupon.max_uses || coupon.used_count < coupon.max_uses
        const meetsMinimum = subtotal >= coupon.min_order_value

        if (notExpired && notExhausted && meetsMinimum) {
          couponDiscount = coupon.discount_type === 'percentage'
            ? subtotal * (coupon.discount_value / 100)
            : coupon.discount_value
          couponId = coupon.id
        }
      }
    }

    // --- Calculate shipping ---
    const { data: shippingRules } = await supabaseAdmin
      .from('shipping_rules')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    let shipping = 19.90
    if (shippingRules?.length) {
      const freeRule = shippingRules.find(r => r.rule_type === 'free_above')
      if (freeRule?.min_order_for_free && subtotal >= freeRule.min_order_for_free) {
        shipping = 0
      } else {
        const stateUpper = shipping_address.state?.toUpperCase()?.trim()
        const stateRule = stateUpper ? shippingRules.find(r => r.rule_type === 'by_state' && r.state?.toUpperCase() === stateUpper) : null
        if (stateRule) shipping = stateRule.value
        else {
          const fixedRule = shippingRules.find(r => r.rule_type === 'fixed')
          if (fixedRule) shipping = fixedRule.value
          else if (freeRule) shipping = freeRule.value
        }
      }
    } else if (subtotal >= 299) {
      shipping = 0
    }

    // --- Pix discount ---
    const afterCoupon = subtotal - couponDiscount + shipping
    const pixDiscount = payment_method === 'pix' ? afterCoupon * 0.05 : 0
    const totalDiscount = couponDiscount + pixDiscount
    const total = afterCoupon - pixDiscount

    // --- Anti-duplicate ---
    if (isDuplicate(customer.email, total)) {
      return new Response(JSON.stringify({ error: 'Pedido duplicado detectado. Aguarde alguns minutos.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Find or create customer ---
    let customerId: string
    const { data: existing } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('email', customer.email)
      .maybeSingle()

    if (existing) {
      customerId = existing.id
      await supabaseAdmin.from('customers').update({
        name: customer.name, phone: customer.phone, cpf: customer.cpf,
        cnpj: customer.cnpj || null, company_name: customer.company_name || null,
        is_reseller: customer.is_reseller || false,
      }).eq('id', customerId)
    } else {
      const { data: newC, error: cErr } = await supabaseAdmin
        .from('customers')
        .insert({
          name: customer.name, email: customer.email, phone: customer.phone,
          cpf: customer.cpf, cnpj: customer.cnpj || null,
          company_name: customer.company_name || null, is_reseller: customer.is_reseller || false,
        })
        .select().single()
      if (cErr) throw cErr
      customerId = newC.id
    }

    // --- Create order ---
    const { data: order, error: oErr } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_id: customerId,
        subtotal, shipping, discount: totalDiscount, total,
        payment_method,
        payment_status: 'pending',
        shipping_address: shipping_address as any,
        status: 'pendente',
      })
      .select().single()
    if (oErr) throw oErr

    // --- Create order items ---
    const orderItems = validatedItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.product_name,
      variant_name: item.variant_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
    }))
    await supabaseAdmin.from('order_items').insert(orderItems)

    // --- Initial status history ---
    await supabaseAdmin.from('order_status_history').insert({
      order_id: order.id,
      to_status: 'pendente',
      note: 'Pedido criado via checkout',
    })

    // --- Increment coupon usage ---
    if (couponId) {
      await supabaseAdmin.rpc('', {}).catch(() => {}) // no-op if no rpc
      // Manual increment
      const { data: couponData } = await supabaseAdmin.from('coupons').select('used_count').eq('id', couponId).single()
      if (couponData) {
        await supabaseAdmin.from('coupons').update({ used_count: couponData.used_count + 1 }).eq('id', couponId)
      }
    }

    // --- Call Mercado Pago ---
    const mpToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    if (!mpToken) {
      // No MP token configured – return order without payment processing
      return new Response(JSON.stringify({
        order_id: order.id,
        order_number: order.order_number,
        payment_status: 'pending',
        payment_method,
        total,
        message: 'Pedido criado. Pagamento será processado quando o gateway estiver configurado.',
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build MP payment body
    const mpBody: any = {
      transaction_amount: Number(total.toFixed(2)),
      description: `Pedido #${order.order_number}`,
      external_reference: order.id,
      payer: {
        email: customer.email,
        first_name: customer.name.split(' ')[0],
        last_name: customer.name.split(' ').slice(1).join(' ') || customer.name,
        identification: { type: 'CPF', number: customer.cpf.replace(/\D/g, '') },
      },
      metadata: { order_id: order.id, order_number: order.order_number },
    }

    if (payment_method === 'pix') {
      mpBody.payment_method_id = 'pix'
    } else if (payment_method === 'card') {
      mpBody.token = card_token
      mpBody.installments = installments || 1
      // Calculate installment amount with interest
      if (installments && installments > 1) {
        const rate = installments <= 6 ? 0.0299 : 0.0349
        const installmentTotal = total * (1 + rate * installments)
        mpBody.transaction_amount = Number(installmentTotal.toFixed(2))
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
      console.error('MP error:', mpData)
      // Update order with error
      await supabaseAdmin.from('orders').update({
        payment_status: 'rejected',
        payment_details: mpData,
      }).eq('id', order.id)

      return new Response(JSON.stringify({
        error: 'Erro no processamento do pagamento',
        details: mpData.message || 'Tente novamente',
        order_id: order.id,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update order with MP data
    const paymentStatus = mpData.status === 'approved' ? 'approved' : 'pending'
    await supabaseAdmin.from('orders').update({
      payment_id: String(mpData.id),
      payment_status: paymentStatus,
      payment_details: mpData,
      status: paymentStatus === 'approved' ? 'confirmado' : 'pendente',
    }).eq('id', order.id)

    if (paymentStatus === 'approved') {
      await supabaseAdmin.from('order_status_history').insert({
        order_id: order.id, from_status: 'pendente', to_status: 'confirmado',
        note: 'Pagamento aprovado automaticamente',
      })
    }

    // Build response based on method
    const response: any = {
      order_id: order.id,
      order_number: order.order_number,
      payment_status: paymentStatus,
      payment_method,
      total: mpBody.transaction_amount,
    }

    if (payment_method === 'pix') {
      const txData = mpData.point_of_interaction?.transaction_data
      response.pix = {
        qr_code: txData?.qr_code,
        qr_code_base64: txData?.qr_code_base64,
        ticket_url: txData?.ticket_url,
        expiration: mpData.date_of_expiration,
      }
    } else if (payment_method === 'boleto') {
      response.boleto = {
        barcode: mpData.barcode?.content,
        external_resource_url: mpData.transaction_details?.external_resource_url,
        expiration: mpData.date_of_expiration,
      }
    } else if (payment_method === 'card') {
      response.card = {
        last_four: mpData.card?.last_four_digits,
        installments: mpData.installments,
        installment_amount: mpData.transaction_details?.installment_amount,
      }
    }

    return new Response(JSON.stringify(response), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('create-payment error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
