import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;

    // Check caller has admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });

    const { data: isGerente } = await adminClient.rpc("has_role", { _user_id: callerId, _role: "gerente" });
    if (!isAdmin && !isGerente) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const { email, password, name, role, tenant_id } = await req.json();
    let tenantId: string | null = typeof tenant_id === "string" && tenant_id ? tenant_id : null;
    if (!isAdmin) {
      // Gerente: só cria vendedor/expedição na própria filial
      if (!["vendedor", "expedicao"].includes(role)) {
        return new Response(JSON.stringify({ error: "Gerente só pode criar vendedor ou expedição" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: prof } = await adminClient.from("profiles").select("tenant_id").eq("user_id", callerId).maybeSingle();
      tenantId = prof?.tenant_id ?? null;
      if (!tenantId) {
        return new Response(JSON.stringify({ error: "Gerente sem filial" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    if (tenantId) {
      const { data: t } = await adminClient.from("tenants").select("id").eq("id", tenantId).maybeSingle();
      if (!t) {
        return new Response(JSON.stringify({ error: "Filial inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (!email || !password || !name || !role) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["super_admin", "admin_only", "vendedor", "expedicao", "gerente"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Insert roles
    const roles = role === "super_admin"
      ? [{ user_id: userId, role: "admin" }, { user_id: userId, role: "financeiro" }]
      : role === "vendedor" ? [{ user_id: userId, role: "vendedor" }]
      : role === "expedicao" ? [{ user_id: userId, role: "expedicao" }]
      : role === "gerente" ? [{ user_id: userId, role: "gerente" }]
      : [{ user_id: userId, role: "operador" }];

    if (tenantId) {
      await adminClient.from("profiles").update({ tenant_id: tenantId }).eq("user_id", userId);
    }

    const { error: rolesError } = await adminClient.from("user_roles").insert(roles);
    if (rolesError) {
      return new Response(JSON.stringify({ error: rolesError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
