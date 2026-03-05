CREATE TABLE public.checkout_idempotency (
  idempotency_key text PRIMARY KEY,
  request_fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  response_payload jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_idempotency ENABLE ROW LEVEL SECURITY;