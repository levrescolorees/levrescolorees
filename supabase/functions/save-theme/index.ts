import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    // Check admin role
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin');
    if (!roles?.length) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { theme, expectedRevision } = body;
    if (!theme) {
      return new Response(JSON.stringify({ error: 'Missing theme' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Read current
    const { data: current } = await supabase.from('store_settings').select('value').eq('key', 'theme').single();
    const currentRevision = current?.value?.revision ?? 0;

    // Compare-and-swap
    if (expectedRevision !== undefined && expectedRevision !== currentRevision) {
      return new Response(JSON.stringify({ error: 'Conflict: revision mismatch', currentRevision }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build new theme
    const newRevision = currentRevision + 1;
    const now = new Date().toISOString();

    // Maintain history (cap 5)
    const history = Array.isArray(theme.history) ? [...theme.history] : [];
    if (current?.value?.tokens) {
      history.push({
        savedAt: now,
        savedById: userId,
        revision: currentRevision,
        theme: { tokens: current.value.tokens, components: current.value.components },
      });
      while (history.length > 5) history.shift();
    }

    const newTheme = {
      ...theme,
      version: 2,
      revision: newRevision,
      meta: {
        ...theme.meta,
        updatedAt: now,
        updatedById: userId,
      },
      history,
    };

    const { error: upsertError } = await supabase.from('store_settings').upsert(
      { key: 'theme', value: newTheme },
      { onConflict: 'key' }
    );
    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ theme: newTheme }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
