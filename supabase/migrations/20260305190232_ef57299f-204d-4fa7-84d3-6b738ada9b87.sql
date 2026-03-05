
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_method text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shipping_label jsonb DEFAULT NULL;
