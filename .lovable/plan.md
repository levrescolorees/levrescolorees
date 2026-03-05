

## Upgrade: Email System Hardening

### Current State

The outbox pattern is already in place (tables, triggers, worker, webhook). This upgrade hardens it with 6 targeted improvements.

### 1. Database Migration

**A) Dequeue RPC with `FOR UPDATE SKIP LOCKED`**

Create `email_outbox_dequeue(p_limit int)` — atomically selects + marks as `sending` in one statement, preventing two workers from grabbing the same row.

**B) Better partial index for worker**

Replace the existing `idx_email_outbox_queue` with a more targeted partial index on `(next_attempt_at) WHERE status = 'queued'` only.

**C) Fix triggers to use `IS DISTINCT FROM`**

Re-create the 3 update trigger functions (`enqueue_email_on_order_status`, `enqueue_email_on_tracking`, `enqueue_email_on_payment_approved`) using `IS DISTINCT FROM` instead of `=` / manual null checks. This handles NULL transitions correctly and is more concise.

**D) Fix `email_delivery_events.outbox_id` to be nullable**

Current schema has `NOT NULL` on outbox_id with `ON DELETE CASCADE`. The webhook may receive events for emails not yet in the outbox (race condition). Change to nullable with `ON DELETE SET NULL`.

**E) Cron job via Vault (no hardcoded tokens)**

- Unschedule the existing cron job
- Store the project URL and `EMAIL_CRON_SECRET` in Vault
- Re-create cron using `vault.decrypted_secrets`

Note: This requires the `EMAIL_CRON_SECRET` secret to be added first. The cron setup will be done via the SQL insert tool (not migration) since it contains project-specific data.

### 2. Edge Function: `email-worker`

Update to:
- Use `supabase.rpc('email_outbox_dequeue')` instead of SELECT + UPDATE
- Send `Idempotency-Key` header to Resend (using the outbox `idempotency_key`)
- Authenticate via `EMAIL_CRON_SECRET` or service role key (accept either)
- Keep existing template rendering logic intact

### 3. Edge Function: `email-webhook`

Update to:
- Accept raw body (text, not JSON) for Svix signature verification
- Verify using the `svix` npm package with `RESEND_WEBHOOK_SECRET`
- Requires new secret: `RESEND_WEBHOOK_SECRET` (from Resend dashboard → Webhooks → Signing Secret)

### 4. New Secrets Required

- `EMAIL_CRON_SECRET` — any random string to protect the worker endpoint
- `RESEND_WEBHOOK_SECRET` — Svix signing secret from Resend webhook settings (optional, can skip webhook verification initially)

### Files Changed

| File | Change |
|------|--------|
| New migration SQL | Dequeue RPC, fix indexes, fix triggers, fix outbox_id nullability |
| SQL insert (not migration) | Vault secrets + cron reschedule |
| `supabase/functions/email-worker/index.ts` | Use RPC dequeue + Idempotency-Key header |
| `supabase/functions/email-webhook/index.ts` | Svix signature verification |

### Order of Implementation

1. Add secrets (`EMAIL_CRON_SECRET`, `RESEND_WEBHOOK_SECRET`)
2. Run migration (RPC, indexes, triggers)
3. Update email-worker edge function
4. Update email-webhook edge function
5. Reschedule cron via Vault (SQL insert)

