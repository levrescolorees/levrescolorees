import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type EmailTemplate = 'order_confirmed' | 'status_updated' | 'tracking_sent';

interface EmailPayload {
  to: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
}

/**
 * send-email — now acts as a thin enqueue wrapper.
 * Inserts into email_outbox instead of sending directly via Resend.
 * The email-worker cron job handles actual delivery with retry/backoff.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();

    if (!payload.to || !payload.template || !payload.data) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, template, data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Build idempotency key from template + entity
    const entityId = (payload.data.order_id as string) || (payload.data.entity_id as string) || crypto.randomUUID();
    let idempotencyKey: string;

    if (payload.template === 'status_updated') {
      idempotencyKey = `status_updated:${entityId}:${payload.data.new_status || 'unknown'}`;
    } else if (payload.template === 'tracking_sent') {
      idempotencyKey = `tracking_sent:${entityId}:${payload.data.tracking_code || 'unknown'}`;
    } else {
      idempotencyKey = `${payload.template}:${entityId}`;
    }

    // Insert into outbox (ON CONFLICT DO NOTHING for idempotency)
    const { error } = await supabaseAdmin.from('email_outbox').insert({
      event_type: payload.template,
      entity_id: entityId,
      to_email: payload.to,
      template_key: payload.template,
      payload: payload.data,
      idempotency_key: idempotencyKey,
    });

    if (error) {
      // Duplicate idempotency key = already enqueued, treat as success
      if (error.code === '23505') {
        console.log(`Email already enqueued (idempotent): ${idempotencyKey}`);
        return new Response(JSON.stringify({ success: true, enqueued: true, deduplicated: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    console.log(`Email enqueued: ${payload.template} → ${payload.to} (key: ${idempotencyKey})`);

    return new Response(JSON.stringify({ success: true, enqueued: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-email enqueue error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
