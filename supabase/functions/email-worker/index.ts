import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Backoff schedule in minutes: 1, 5, 15, 60, 240, 720
const BACKOFF_MINUTES = [1, 5, 15, 60, 240, 720];

type EmailTemplate = 'order_confirmed' | 'status_updated' | 'tracking_sent';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pendente: '#EAB308',
  confirmado: '#3B82F6',
  preparando: '#F97316',
  enviado: '#8B5CF6',
  entregue: '#22C55E',
  cancelado: '#EF4444',
};

const STATUS_ORDER = ['pendente', 'confirmado', 'preparando', 'enviado', 'entregue'];

function baseStyle(): string {
  return `
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: #18181b; padding: 24px 32px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 20px; margin: 0; letter-spacing: 1px; }
    .content { padding: 32px; }
    .footer { background: #f4f4f5; padding: 20px 32px; text-align: center; font-size: 12px; color: #71717a; }
    .btn { display: inline-block; background: #18181b; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; }
    .item-row td { padding: 8px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #3f3f46; }
    .total-row td { padding: 12px 0; font-size: 16px; font-weight: 700; color: #18181b; }
    .label { color: #71717a; font-size: 13px; }
    .value { font-size: 14px; color: #18181b; }
  `;
}

function progressBar(currentStatus: string): string {
  const idx = STATUS_ORDER.indexOf(currentStatus);
  return `
    <table style="width:100%;margin:16px 0;">
      <tr>
        ${STATUS_ORDER.map((s, i) => {
          const active = i <= idx;
          const bg = active ? (STATUS_COLORS[currentStatus] || '#18181b') : '#e4e4e7';
          const textColor = active ? '#18181b' : '#a1a1aa';
          return `<td style="text-align:center;padding:4px;">
            <div style="height:4px;background:${bg};border-radius:2px;margin-bottom:4px;"></div>
            <span style="font-size:10px;color:${textColor};">${STATUS_LABELS[s]}</span>
          </td>`;
        }).join('')}
      </tr>
    </table>
  `;
}

function orderConfirmedTemplate(data: Record<string, unknown>, storeName: string): { subject: string; html: string } {
  const items = (data.items as Array<{ product_name: string; variant_name?: string; quantity: number; unit_price: number; total_price: number }>) || [];
  const orderNumber = data.order_number as number;
  const total = data.total as number;
  const subtotal = data.subtotal as number;
  const shipping = data.shipping as number;
  const discount = data.discount as number;
  const paymentMethod = data.payment_method as string;
  const addr = data.shipping_address as Record<string, string> | null;
  const customerName = (data.customer_name as string) || 'Cliente';

  const itemRows = items.map(item => `
    <tr class="item-row">
      <td>${item.product_name}${item.variant_name ? ` <span style="color:#a1a1aa;">(${item.variant_name})</span>` : ''}</td>
      <td style="text-align:center;">${item.quantity}</td>
      <td style="text-align:right;">${formatCurrency(item.total_price)}</td>
    </tr>
  `).join('');

  const paymentLabels: Record<string, string> = { pix: 'PIX', card: 'Cartão de Crédito', boleto: 'Boleto' };

  return {
    subject: `Pedido #${orderNumber} confirmado! 🎉`,
    html: `<!DOCTYPE html><html><head><style>${baseStyle()}</style></head><body>
      <div style="padding:20px;background:#f4f4f5;">
        <div class="container">
          <div class="header"><h1>Pedido Confirmado! ✨</h1></div>
          <div class="content">
            <p style="font-size:16px;color:#18181b;">Olá, <strong>${customerName}</strong>!</p>
            <p style="font-size:14px;color:#3f3f46;">Seu pedido <strong>#${orderNumber}</strong> foi recebido e está sendo processado.</p>
            ${progressBar('confirmado')}
            ${items.length > 0 ? `
            <h3 style="font-size:14px;color:#18181b;margin:24px 0 8px;border-bottom:2px solid #18181b;padding-bottom:4px;">Itens do Pedido</h3>
            <table>
              <thead><tr style="border-bottom:1px solid #e4e4e7;">
                <th style="text-align:left;padding:8px 0;font-size:12px;color:#71717a;">PRODUTO</th>
                <th style="text-align:center;padding:8px 0;font-size:12px;color:#71717a;">QTD</th>
                <th style="text-align:right;padding:8px 0;font-size:12px;color:#71717a;">VALOR</th>
              </tr></thead>
              <tbody>${itemRows}</tbody>
            </table>` : ''}
            <table style="margin-top:12px;">
              <tr><td class="label">Subtotal</td><td style="text-align:right;" class="value">${formatCurrency(subtotal || 0)}</td></tr>
              <tr><td class="label">Frete</td><td style="text-align:right;" class="value">${shipping === 0 ? '<span style="color:#22c55e;">Grátis</span>' : formatCurrency(shipping || 0)}</td></tr>
              ${(discount || 0) > 0 ? `<tr><td class="label">Desconto</td><td style="text-align:right;color:#22c55e;">-${formatCurrency(discount)}</td></tr>` : ''}
              <tr class="total-row"><td>Total</td><td style="text-align:right;">${formatCurrency(total || 0)}</td></tr>
              <tr><td class="label">Pagamento</td><td style="text-align:right;" class="value">${paymentLabels[paymentMethod] || paymentMethod || '-'}</td></tr>
            </table>
            ${addr ? `
            <h3 style="font-size:14px;color:#18181b;margin:24px 0 8px;border-bottom:2px solid #18181b;padding-bottom:4px;">Endereço de Entrega</h3>
            <p style="font-size:13px;color:#3f3f46;line-height:1.6;">
              ${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ''}<br>
              ${addr.neighborhood ? `${addr.neighborhood} - ` : ''}${addr.city}/${addr.state}<br>
              CEP: ${addr.zip}
            </p>` : ''}
            <p style="text-align:center;margin-top:28px;">
              <a href="${data.tracking_url || '#'}" class="btn">Acompanhar Pedido</a>
            </p>
          </div>
          <div class="footer">
            <p>Você receberá atualizações por email a cada mudança de status.</p>
            <p>${storeName}</p>
          </div>
        </div>
      </div>
    </body></html>`,
  };
}

function statusUpdatedTemplate(data: Record<string, unknown>, storeName: string): { subject: string; html: string } {
  const orderNumber = data.order_number as number;
  const newStatus = data.new_status as string;
  const customerName = (data.customer_name as string) || 'Cliente';
  const note = data.note as string | null;

  const statusLabel = STATUS_LABELS[newStatus] || newStatus;
  const statusColor = STATUS_COLORS[newStatus] || '#18181b';

  const statusMessages: Record<string, string> = {
    confirmado: 'Seu pagamento foi confirmado e estamos preparando tudo para você!',
    preparando: 'Seu pedido está sendo separado e embalado com carinho.',
    enviado: 'Seu pedido saiu para entrega! Em breve estará com você.',
    entregue: 'Seu pedido foi entregue! Esperamos que goste. 💕',
    cancelado: 'Seu pedido foi cancelado. Se tiver dúvidas, entre em contato conosco.',
  };

  return {
    subject: `Pedido #${orderNumber} — ${statusLabel}`,
    html: `<!DOCTYPE html><html><head><style>${baseStyle()}</style></head><body>
      <div style="padding:20px;background:#f4f4f5;">
        <div class="container">
          <div class="header"><h1>Atualização do Pedido</h1></div>
          <div class="content">
            <p style="font-size:16px;color:#18181b;">Olá, <strong>${customerName}</strong>!</p>
            <div style="text-align:center;margin:24px 0;">
              <span style="display:inline-block;background:${statusColor}20;color:${statusColor};padding:8px 20px;border-radius:20px;font-weight:600;font-size:15px;">
                ${statusLabel}
              </span>
            </div>
            <p style="font-size:14px;color:#3f3f46;text-align:center;">
              ${statusMessages[newStatus] || `O status do seu pedido #${orderNumber} foi atualizado.`}
            </p>
            ${newStatus !== 'cancelado' ? progressBar(newStatus) : ''}
            ${note ? `<p style="font-size:13px;color:#71717a;margin-top:16px;padding:12px;background:#f4f4f5;border-radius:6px;"><strong>Observação:</strong> ${note}</p>` : ''}
            <p style="text-align:center;margin-top:28px;">
              <a href="${data.tracking_url || '#'}" class="btn">Acompanhar Pedido</a>
            </p>
          </div>
          <div class="footer"><p>${storeName}</p></div>
        </div>
      </div>
    </body></html>`,
  };
}

function trackingSentTemplate(data: Record<string, unknown>, storeName: string): { subject: string; html: string } {
  const orderNumber = data.order_number as number;
  const trackingCode = data.tracking_code as string;
  const customerName = (data.customer_name as string) || 'Cliente';
  const correiosUrl = `https://www.linkcorreios.com.br/?id=${trackingCode}`;

  return {
    subject: `Pedido #${orderNumber} — Código de rastreio disponível! 📦`,
    html: `<!DOCTYPE html><html><head><style>${baseStyle()}</style></head><body>
      <div style="padding:20px;background:#f4f4f5;">
        <div class="container">
          <div class="header"><h1>Seu Pedido Foi Enviado! 🚚</h1></div>
          <div class="content">
            <p style="font-size:16px;color:#18181b;">Olá, <strong>${customerName}</strong>!</p>
            <p style="font-size:14px;color:#3f3f46;">Ótimas notícias! Seu pedido <strong>#${orderNumber}</strong> está a caminho.</p>
            ${progressBar('enviado')}
            <div style="text-align:center;margin:24px 0;padding:20px;background:#f4f4f5;border-radius:8px;">
              <p style="font-size:12px;color:#71717a;margin:0 0 8px;">CÓDIGO DE RASTREIO</p>
              <p style="font-size:22px;font-weight:700;color:#18181b;margin:0;letter-spacing:2px;">${trackingCode}</p>
            </div>
            <p style="text-align:center;">
              <a href="${correiosUrl}" class="btn" style="margin-right:8px;">Rastrear nos Correios</a>
            </p>
            <p style="text-align:center;margin-top:12px;">
              <a href="${data.tracking_url || '#'}" style="font-size:13px;color:#3b82f6;">Acompanhar na loja</a>
            </p>
          </div>
          <div class="footer"><p>${storeName}</p></div>
        </div>
      </div>
    </body></html>`,
  };
}

function buildEmail(template: EmailTemplate, data: Record<string, unknown>, storeName: string): { subject: string; html: string } {
  switch (template) {
    case 'order_confirmed': return orderConfirmedTemplate(data, storeName);
    case 'status_updated': return statusUpdatedTemplate(data, storeName);
    case 'tracking_sent': return trackingSentTemplate(data, storeName);
    default: throw new Error(`Template desconhecido: ${template}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate: accept cron secret or service role key
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const cronSecret = Deno.env.get('EMAIL_CRON_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Allow service role key or cron secret
  if (token !== serviceRoleKey && (!cronSecret || token !== cronSecret)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
  );

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get store name & from email
    const { data: brandSetting } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'brand')
      .maybeSingle();

    const storeName = (brandSetting?.value as any)?.name || 'Nossa Loja';
    const resendFrom = Deno.env.get('RESEND_FROM') || `${storeName} <onboarding@resend.dev>`;

    // Fetch up to 10 queued emails ready to send
    const { data: emails, error: fetchErr } = await supabaseAdmin
      .from('email_outbox')
      .select('*')
      .eq('status', 'queued')
      .lte('next_attempt_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchErr) {
      console.error('Failed to fetch outbox:', fetchErr);
      return new Response(JSON.stringify({ error: 'Failed to fetch outbox' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!emails || emails.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      // Mark as sending
      await supabaseAdmin
        .from('email_outbox')
        .update({ status: 'sending' })
        .eq('id', email.id);

      try {
        // For order_confirmed, if items are missing, fetch them
        const payload = email.payload as Record<string, unknown>;
        if (email.template_key === 'order_confirmed' && (!payload.items || (Array.isArray(payload.items) && payload.items.length === 0))) {
          if (email.entity_id) {
            const { data: orderItems } = await supabaseAdmin
              .from('order_items')
              .select('product_name, variant_name, quantity, unit_price, total_price')
              .eq('order_id', email.entity_id);
            if (orderItems && orderItems.length > 0) {
              payload.items = orderItems;
            }
          }
        }

        // Add tracking URL
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
        payload.tracking_url = payload.tracking_url || `https://${projectRef}.supabase.co`;

        const { subject, html } = buildEmail(email.template_key as EmailTemplate, payload, storeName);

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [email.to_email],
            subject,
            html,
          }),
        });

        const resendData = await resendRes.json();

        if (resendRes.ok) {
          await supabaseAdmin
            .from('email_outbox')
            .update({
              status: 'sent',
              provider_message_id: resendData.id,
              attempts: email.attempts + 1,
            })
            .eq('id', email.id);

          console.log(`✅ Email sent: ${email.template_key} → ${email.to_email} (${resendData.id})`);
          sent++;
        } else {
          throw new Error(JSON.stringify(resendData));
        }
      } catch (err) {
        const attempts = email.attempts + 1;
        const backoffIdx = Math.min(attempts - 1, BACKOFF_MINUTES.length - 1);
        const backoffMs = BACKOFF_MINUTES[backoffIdx] * 60 * 1000;
        const nextAttempt = new Date(Date.now() + backoffMs).toISOString();

        const newStatus = attempts >= email.max_attempts ? 'failed' : 'queued';

        await supabaseAdmin
          .from('email_outbox')
          .update({
            status: newStatus,
            attempts,
            next_attempt_at: nextAttempt,
            last_error: String(err).slice(0, 500),
          })
          .eq('id', email.id);

        console.error(`❌ Email failed (attempt ${attempts}/${email.max_attempts}): ${email.template_key} → ${email.to_email}: ${String(err).slice(0, 200)}`);
        failed++;
      }
    }

    return new Response(JSON.stringify({ processed: emails.length, sent, failed }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('email-worker error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
