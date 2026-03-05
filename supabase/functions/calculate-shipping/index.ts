import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ShippingProduct {
  weight: number;
  height: number;
  width: number;
  length: number;
  quantity: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postal_code_to, products } = await req.json() as {
      postal_code_to: string;
      products: ShippingProduct[];
    };

    if (!postal_code_to || !products?.length) {
      return new Response(
        JSON.stringify({ error: "CEP de destino e produtos são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get SuperFrete settings from store_settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settingsRow } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "superfrete")
      .single();

    const settings = (settingsRow?.value || {}) as Record<string, unknown>;
    const originZip = (settings.origin_zip as string) || "";
    const environment = (settings.environment as string) || "sandbox";
    const enabledServices = (settings.services as string[]) || ["PAC", "SEDEX", "Mini Envios"];

    const superfreteToken = (settings.token as string) || Deno.env.get("SUPERFRETE_TOKEN");
    if (!superfreteToken) {
      return new Response(
        JSON.stringify({ error: "Token da SuperFrete não configurado. Configure em Admin → Integrações → SuperFrete." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!originZip) {
      return new Response(
        JSON.stringify({ error: "CEP de origem não configurado. Configure em Admin → Integrações." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate dimensions: sum weights, max dimensions
    let totalWeight = 0;
    let maxHeight = 0;
    let maxWidth = 0;
    let totalLength = 0;

    for (const p of products) {
      const qty = p.quantity || 1;
      totalWeight += (p.weight || 0.3) * qty;
      maxHeight = Math.max(maxHeight, p.height || 2);
      maxWidth = Math.max(maxWidth, p.width || 11);
      totalLength += (p.length || 16) * qty;
    }

    // Enforce minimums (Correios rules)
    totalWeight = Math.max(totalWeight, 0.3);
    maxHeight = Math.max(maxHeight, 2);
    maxWidth = Math.max(maxWidth, 11);
    totalLength = Math.min(Math.max(totalLength, 16), 100);

    const baseUrl = environment === "production"
      ? "https://api.superfrete.com"
      : "https://sandbox.superfrete.com";

    const body = {
      from: { postal_code: originZip.replace(/\D/g, "") },
      to: { postal_code: postal_code_to.replace(/\D/g, "") },
      package: {
        weight: totalWeight,
        height: maxHeight,
        width: maxWidth,
        length: totalLength,
      },
    };

    const response = await fetch(`${baseUrl}/api/v0/calculator`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${superfreteToken}`,
        "Content-Type": "application/json",
        "User-Agent": "LevresApp/1.0",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SuperFrete API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar frete", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    // Normalize response — SuperFrete returns array of options
    const options = (Array.isArray(result) ? result : result?.dispatchers || result?.data || [])
      .filter((opt: any) => !opt.error && opt.price !== undefined)
      .filter((opt: any) => {
        const name = (opt.name || opt.company?.name || "").toUpperCase();
        return enabledServices.some((s: string) => name.includes(s.toUpperCase()));
      })
      .map((opt: any) => ({
        id: opt.id || `${opt.name}-${opt.price}`,
        name: opt.name || opt.company?.name || "Transportadora",
        company: opt.company?.name || opt.name || "",
        price: typeof opt.price === "string" ? parseFloat(opt.price) : opt.price,
        delivery_time: opt.delivery_time || opt.custom_delivery_time || 0,
        currency: opt.currency || "BRL",
      }));

    return new Response(
      JSON.stringify({ options }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("calculate-shipping error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao calcular frete" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
