import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json();

    // Resend webhook event types: email.sent, email.delivered, email.bounced,
    // email.complained, email.delivery_delayed, email.opened, email.clicked
    const eventType = body.type as string;
    const eventData = body.data as Record<string, unknown>;

    if (!eventType || !eventData) {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map Resend event types to our simplified types
    const eventMap: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
      'email.delivery_delayed': 'delayed',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
    };

    const mappedType = eventMap[eventType];
    if (!mappedType) {
      console.log(`Ignoring unknown event type: ${eventType}`);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailId = eventData.email_id as string;
    if (!emailId) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the outbox entry by provider_message_id
    const { data: outboxEntry } = await supabaseAdmin
      .from('email_outbox')
      .select('id')
      .eq('provider_message_id', emailId)
      .maybeSingle();

    if (!outboxEntry) {
      console.log(`No outbox entry found for provider_message_id: ${emailId}`);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert delivery event
    await supabaseAdmin.from('email_delivery_events').insert({
      outbox_id: outboxEntry.id,
      event_type: mappedType,
      raw_payload: body,
    });

    // Update outbox status on bounce/complaint
    if (mappedType === 'bounced' || mappedType === 'complained') {
      await supabaseAdmin
        .from('email_outbox')
        .update({ status: 'failed', last_error: `${mappedType}: ${JSON.stringify(eventData).slice(0, 300)}` })
        .eq('id', outboxEntry.id);
    }

    console.log(`📨 Webhook: ${mappedType} for outbox ${outboxEntry.id}`);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('email-webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
