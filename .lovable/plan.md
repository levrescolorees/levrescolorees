

## Upgrade: Sistema de Emails Transacionais com Outbox Pattern

### Resumo

Migrar de chamadas diretas ao Resend (fire-and-forget) para uma arquitetura robusta com fila de emails (outbox), worker com retry/backoff, idempotência nativa e logs de entrega.

### Mudanças no Banco de Dados

**Nova tabela `email_outbox`:**
- `id` (uuid PK)
- `event_type` (text) — ex: `order_confirmed`, `status_updated`, `tracking_sent`
- `entity_id` (text) — ex: order_id
- `to_email` (text)
- `template_key` (text)
- `payload` (jsonb)
- `status` (text: `queued` | `sending` | `sent` | `failed` | `canceled`)
- `attempts` (int, default 0)
- `max_attempts` (int, default 6)
- `next_attempt_at` (timestamptz, default now())
- `provider` (text, default `resend`)
- `provider_message_id` (text nullable)
- `last_error` (text nullable)
- `idempotency_key` (text unique) — dedupe nativo
- `created_at`, `updated_at` (timestamptz)

RLS: staff pode SELECT; INSERT via service_role (triggers/edge functions).

**Nova tabela `email_delivery_events`:**
- `id` (uuid PK)
- `outbox_id` (uuid FK → email_outbox)
- `event_type` (text: `delivered`, `bounced`, `complained`, `opened`, `clicked`)
- `raw_payload` (jsonb)
- `created_at` (timestamptz)

RLS: staff pode SELECT.

**Triggers no banco (approach event-driven):**
- `AFTER UPDATE OF status ON orders` → insere na `email_outbox` com `event_type = 'status_updated'`
- `AFTER UPDATE OF tracking_code ON orders` → insere na `email_outbox` com `event_type = 'tracking_sent'`
- `AFTER UPDATE OF payment_status ON orders` (quando vira `approved`) → insere com `event_type = 'order_confirmed'`

Cada trigger gera um `idempotency_key` no formato `{event_type}:{order_id}:{valor}` para evitar duplicidade.

### Novos Secrets

- `RESEND_FROM` (ex: `Lèvres <noreply@mail.levres.com.br>`)
- `EMAIL_CRON_SECRET` (proteção do worker)

### Edge Functions

**A) Refatorar `send-email` → `email-worker` (JWT OFF, protegido por `EMAIL_CRON_SECRET`)**
- Busca até 10 emails `queued` com `next_attempt_at <= now()`
- Marca como `sending`
- Envia via Resend API
- Atualiza `sent` ou `failed`, grava `provider_message_id`
- Retry com backoff exponencial: 1min, 5min, 15min, 1h, 4h, 12h
- Lê `RESEND_FROM` para o remetente (fallback para store_settings)
- Protegido por header `Authorization: Bearer ${EMAIL_CRON_SECRET}`

**B) Nova `email-webhook` (JWT OFF, protegido por assinatura Resend)**
- Recebe eventos do Resend (delivered, bounced, complained)
- Insere em `email_delivery_events`
- Atualiza status na `email_outbox` se bounce/complaint

**C) Manter `send-email` como wrapper fino (opcional)**
- Aceita o mesmo payload de antes mas em vez de chamar Resend diretamente, insere na `email_outbox`
- Assim o código existente no `useOrders.ts` continua funcionando sem mudança imediata

### Integração via Triggers (desacoplado)

Os triggers no banco substituem as chamadas manuais nos hooks e no `create-payment`. Quando o `create-payment` faz `UPDATE orders SET status = 'confirmado'`, o trigger automaticamente enfileira o email. O mesmo para status updates e tracking.

Isso significa:
- **Remover** as chamadas fire-and-forget de email do `create-payment/index.ts`
- **Remover** as chamadas de email do `useUpdateOrderStatus` e `useUpdateTracking` no `useOrders.ts`
- Qualquer fluxo que altere status/tracking no banco automaticamente dispara email

### Cron Job (pg_cron)

Agendar o `email-worker` a cada 2 minutos via `pg_cron + pg_net`:
```sql
SELECT cron.schedule('email-worker', '*/2 * * * *', $$
  SELECT net.http_post(
    url := 'https://jefuidilwgzsnifjgdaf.supabase.co/functions/v1/email-worker',
    headers := '{"Authorization":"Bearer <EMAIL_CRON_SECRET>","Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
```

### Templates

Manter os templates HTML inline existentes dentro do `email-worker`. A lógica de `buildEmail` atual é preservada — só muda de onde é chamada (worker em vez de request direto).

### Fluxo Final

```text
Evento no banco (status/tracking/pagamento)
  → Trigger insere email_outbox (com idempotency_key)
  → Cron dispara email-worker a cada 2min
  → Worker envia via Resend API (com retry)
  → Webhook do Resend registra delivery/bounce
```

### Ordem de Implementação

1. Criar tabelas `email_outbox` e `email_delivery_events` (migration)
2. Criar triggers no banco para enfileirar emails
3. Criar edge function `email-worker` (com templates existentes + retry)
4. Criar edge function `email-webhook` (eventos Resend)
5. Refatorar `send-email` para inserir na outbox (manter compatibilidade)
6. Remover chamadas diretas de email do `create-payment` e `useOrders.ts`
7. Configurar cron job via pg_cron
8. Adicionar secrets `RESEND_FROM` e `EMAIL_CRON_SECRET`

