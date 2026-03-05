import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Allow service-role calls (e.g. from mp-webhook auto-generation)
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;

    let supabaseAdmin: ReturnType<typeof createClient>;

    if (isServiceRole) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    } else {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser();
      if (claimsError || !claimsData?.user) {
        return jsonResponse({ error: "Não autorizado" }, 401);
      }

      const userId = claimsData.user.id;
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // Check if user is staff
      const { data: isStaff } = await supabaseAdmin.rpc("is_admin_or_operador", { _user_id: userId });
      if (!isStaff) {
        return jsonResponse({ error: "Sem permissão" }, 403);
      }
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return jsonResponse({ error: "order_id obrigatório" }, 400);
    }

    // Get order with customer and items
    const [{ data: order, error: orderErr }, { data: items }] = await Promise.all([
      supabaseAdmin.from("orders").select("*, customers(*)").eq("id", order_id).single(),
      supabaseAdmin.from("order_items").select("*").eq("order_id", order_id),
    ]);

    if (orderErr || !order) {
      return jsonResponse({ error: "Pedido não encontrado" }, 404);
    }

    if (order.shipping_label) {
      return jsonResponse({ error: "Etiqueta já foi gerada para este pedido", label: order.shipping_label }, 400);
    }

    const customer = (order as any).customers;
    const addr = order.shipping_address as Record<string, string> | null;
    if (!addr || !customer) {
      return jsonResponse({ error: "Pedido sem endereço ou cliente" }, 400);
    }

    // Get SuperFrete settings
    const { data: settingsRow } = await supabaseAdmin
      .from("store_settings")
      .select("value")
      .eq("key", "superfrete")
      .single();

    const settings = (settingsRow?.value || {}) as Record<string, unknown>;
    const originZip = (settings.origin_zip as string) || "";
    const environment = (settings.environment as string) || "sandbox";
    const superfreteToken = (settings.token as string) || Deno.env.get("SUPERFRETE_TOKEN");

    if (!superfreteToken) {
      return jsonResponse({ error: "Token da SuperFrete não configurado" }, 500);
    }
    if (!originZip) {
      return jsonResponse({ error: "CEP de origem não configurado" }, 400);
    }

    // Get sender info from store settings
    const { data: storeRow } = await supabaseAdmin
      .from("store_settings")
      .select("value")
      .eq("key", "store_info")
      .maybeSingle();
    const storeInfo = (storeRow?.value || {}) as Record<string, unknown>;

    // Calculate package dimensions from order items
    let totalWeight = 0;
    let maxHeight = 0;
    let maxWidth = 0;
    let totalLength = 0;

    if (items?.length) {
      const productIds = items.map((i: any) => i.product_id).filter(Boolean);
      const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, weight, height, width, length")
        .in("id", productIds);

      const prodMap = new Map((products || []).map((p: any) => [p.id, p]));

      for (const item of items) {
        const prod = prodMap.get(item.product_id);
        const qty = item.quantity || 1;
        totalWeight += ((prod?.weight as number) || 0.3) * qty;
        maxHeight = Math.max(maxHeight, (prod?.height as number) || 2);
        maxWidth = Math.max(maxWidth, (prod?.width as number) || 11);
        totalLength += ((prod?.length as number) || 16) * qty;
      }
    }

    totalWeight = Math.max(totalWeight, 0.3);
    maxHeight = Math.max(maxHeight, 2);
    maxWidth = Math.max(maxWidth, 11);
    totalLength = Math.min(Math.max(totalLength, 16), 100);

    // Map shipping_method to SuperFrete service code
    const serviceMap: Record<string, number> = {
      "PAC": 1,
      "SEDEX": 2,
      "MINI ENVIOS": 17,
    };

    const shippingMethod = (order.shipping_method || "PAC").toUpperCase();
    const serviceCode = serviceMap[shippingMethod] || 1;

    const baseUrl = environment === "production"
      ? "https://api.superfrete.com"
      : "https://sandbox.superfrete.com";

    // Build the order payload for SuperFrete
    const labelPayload = {
      service: serviceCode,
      from: {
        name: (storeInfo.name as string) || "Loja",
        phone: (storeInfo.phone as string) || "",
        email: (storeInfo.email as string) || "",
        document: (storeInfo.document as string) || "",
        address: (storeInfo.street as string) || "",
        complement: (storeInfo.complement as string) || "",
        number: (storeInfo.number as string) || "",
        district: (storeInfo.neighborhood as string) || "",
        city: (storeInfo.city as string) || "",
        state_abbr: (storeInfo.state as string) || "",
        postal_code: originZip.replace(/\D/g, ""),
        country_id: "BR",
      },
      to: {
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        document: customer.cpf || "",
        address: addr.street || "",
        complement: addr.complement || "",
        number: addr.number || "",
        district: addr.neighborhood || "",
        city: addr.city || "",
        state_abbr: addr.state || "",
        postal_code: (addr.zip || "").replace(/\D/g, ""),
        country_id: "BR",
      },
      volumes: {
        weight: totalWeight,
        height: maxHeight,
        width: maxWidth,
        length: totalLength,
      },
      options: {
        insurance_value: Number(order.total) || 0,
        receipt: false,
        own_hand: false,
        non_commercial: true,
      },
    };

    console.log("SuperFrete label request:", JSON.stringify(labelPayload));

    const response = await fetch(`${baseUrl}/api/v0/cart`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superfreteToken}`,
        "Content-Type": "application/json",
        "User-Agent": "LevresApp/1.0",
        Accept: "application/json",
      },
      body: JSON.stringify(labelPayload),
    });

    const responseText = await response.text();
    console.log("SuperFrete label response:", response.status, responseText);

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch {
      return jsonResponse({ error: "Resposta inválida da SuperFrete", details: responseText }, 502);
    }

    if (!response.ok) {
      return jsonResponse({ error: "Erro ao gerar etiqueta na SuperFrete", details: result }, 502);
    }

    const superfreteOrderId = result.id || null;

    // Step 2: Auto-pay the label using account balance via checkout endpoint
    let checkoutResult: any = null;
    if (superfreteOrderId) {
      try {
        const checkoutRes = await fetch(`${baseUrl}/api/v0/checkout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${superfreteToken}`,
            "Content-Type": "application/json",
            "User-Agent": "LevresApp/1.0",
            Accept: "application/json",
          },
          body: JSON.stringify({ orders: [superfreteOrderId] }),
        });

        const checkoutText = await checkoutRes.text();
        console.log("SuperFrete checkout response:", checkoutRes.status, checkoutText);

        try {
          checkoutResult = JSON.parse(checkoutText);
        } catch {
          console.warn("SuperFrete checkout response not JSON:", checkoutText);
        }

        if (!checkoutRes.ok) {
          console.warn("SuperFrete checkout failed (label created but not paid):", checkoutResult);
        }
      } catch (checkoutErr) {
        console.warn("SuperFrete checkout error:", checkoutErr);
      }
    }

    // Determine final status: if checkout succeeded, status should be "released"
    const isPaid = checkoutResult && !checkoutResult.error;
    const finalStatus = isPaid ? "released" : (result.status || "pending");

    // After checkout, tracking may be available - re-fetch order info if paid
    let trackingCode = result.tracking || null;
    let labelUrl = result.print?.url || null;

    if (isPaid && superfreteOrderId) {
      try {
        const infoRes = await fetch(`${baseUrl}/api/v0/order/info/${superfreteOrderId}`, {
          headers: {
            Authorization: `Bearer ${superfreteToken}`,
            "User-Agent": "LevresApp/1.0",
            Accept: "application/json",
          },
        });
        if (infoRes.ok) {
          const infoData = await infoRes.json();
          trackingCode = infoData.tracking || trackingCode;
          labelUrl = infoData.print?.url || labelUrl;
          console.log("SuperFrete order info after checkout:", JSON.stringify(infoData));
        }
      } catch (infoErr) {
        console.warn("Failed to fetch order info after checkout:", infoErr);
      }
    }

    // Save label data to order
    const labelData = {
      superfrete_order_id: superfreteOrderId,
      tracking_code: trackingCode,
      label_url: labelUrl,
      service_name: shippingMethod,
      status: finalStatus,
      paid: isPaid,
      created_at: new Date().toISOString(),
      raw: result,
      checkout_raw: checkoutResult,
    };

    const updatePayload: Record<string, unknown> = {
      shipping_label: labelData,
    };

    if (trackingCode) {
      updatePayload.tracking_code = trackingCode;
    }

    await supabaseAdmin
      .from("orders")
      .update(updatePayload)
      .eq("id", order_id);

    return jsonResponse({
      success: true,
      paid: isPaid,
      label: labelData,
    });
  } catch (error) {
    console.error("generate-shipping-label error:", error);
    return jsonResponse({ error: "Erro interno ao gerar etiqueta" }, 500);
  }
});
