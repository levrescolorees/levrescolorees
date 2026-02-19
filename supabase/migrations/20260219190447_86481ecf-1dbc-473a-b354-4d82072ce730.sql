
ALTER TABLE public.orders
  ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN payment_id TEXT,
  ADD COLUMN payment_details JSONB;
