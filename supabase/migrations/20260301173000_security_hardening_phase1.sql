-- Security hardening phase 1
-- Scope: lock down sensitive reads/writes, expose safe public accessors,
-- and add persistent controls for idempotency, rate limiting and webhook dedup.

-- Remove unsafe public policies.
DROP POLICY IF EXISTS "Public can view own order" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders at checkout" ON public.orders;
DROP POLICY IF EXISTS "Public can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can insert initial status" ON public.order_status_history;
DROP POLICY IF EXISTS "Public can insert customers at checkout" ON public.customers;
DROP POLICY IF EXISTS "Store settings are publicly readable" ON public.store_settings;
DROP POLICY IF EXISTS "Coupons are publicly readable" ON public.coupons;

-- Recreate read policies with restricted scope.
DROP POLICY IF EXISTS "Staff can view store settings" ON public.store_settings;
CREATE POLICY "Staff can view store settings"
ON public.store_settings FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can view coupons" ON public.coupons;
CREATE POLICY "Staff can view coupons"
ON public.coupons FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Public-safe settings accessor. Never expose private payment secrets.
CREATE OR REPLACE FUNCTION public.get_public_store_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_record record;
  result jsonb := '{}'::jsonb;
  sanitized jsonb;
BEGIN
  FOR row_record IN
    SELECT key, value
    FROM public.store_settings
  LOOP
    sanitized := row_record.value;

    IF row_record.key = 'mercado_pago' THEN
      sanitized := jsonb_build_object(
        'public_key', COALESCE(row_record.value->>'public_key', ''),
        'enabled', COALESCE((row_record.value->>'enabled')::boolean, false),
        'pix_enabled', COALESCE((row_record.value->>'pix_enabled')::boolean, true),
        'card_enabled', COALESCE((row_record.value->>'card_enabled')::boolean, true),
        'boleto_enabled', COALESCE((row_record.value->>'boleto_enabled')::boolean, true),
        'max_installments',
          CASE
            WHEN COALESCE(row_record.value->>'max_installments', '') ~ '^[0-9]+$'
            THEN (row_record.value->>'max_installments')::int
            ELSE 12
          END,
        'environment', COALESCE(row_record.value->>'environment', 'sandbox')
      );
    END IF;

    result := result || jsonb_build_object(row_record.key, sanitized);
  END LOOP;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_store_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_settings() TO anon, authenticated, service_role;

-- Coupon validation helper without exposing the coupons table publicly.
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_subtotal numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coupon_row record;
  normalized_code text := upper(trim(COALESCE(p_code, '')));
BEGIN
  IF normalized_code = '' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Codigo de cupom vazio'
    );
  END IF;

  SELECT *
    INTO coupon_row
  FROM public.coupons
  WHERE code = normalized_code
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Cupom invalido');
  END IF;

  IF coupon_row.expires_at IS NOT NULL AND coupon_row.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Cupom expirado');
  END IF;

  IF coupon_row.max_uses IS NOT NULL AND coupon_row.used_count >= coupon_row.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Cupom esgotado');
  END IF;

  IF COALESCE(coupon_row.min_order_value, 0) > COALESCE(p_subtotal, 0) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Pedido minimo nao atingido',
      'min_order_value', coupon_row.min_order_value
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code', coupon_row.code,
    'discount_type', coupon_row.discount_type,
    'discount_value', coupon_row.discount_value,
    'min_order_value', coupon_row.min_order_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon, authenticated, service_role;

-- Persistent idempotency registry for checkout requests.
CREATE TABLE IF NOT EXISTS public.checkout_idempotency (
  idempotency_key text PRIMARY KEY,
  request_fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  order_id uuid NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  response_payload jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE INDEX IF NOT EXISTS idx_checkout_idempotency_expires_at
  ON public.checkout_idempotency (expires_at);

DROP TRIGGER IF EXISTS update_checkout_idempotency_updated_at ON public.checkout_idempotency;
CREATE TRIGGER update_checkout_idempotency_updated_at
  BEFORE UPDATE ON public.checkout_idempotency
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.checkout_idempotency ENABLE ROW LEVEL SECURITY;

-- Persistent counters for rate limiting windows.
CREATE TABLE IF NOT EXISTS public.request_rate_limits (
  identifier text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (identifier, window_start)
);

DROP TRIGGER IF EXISTS update_request_rate_limits_updated_at ON public.request_rate_limits;
CREATE TRIGGER update_request_rate_limits_updated_at
  BEFORE UPDATE ON public.request_rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.request_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_identifier text,
  p_window_seconds integer,
  p_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  window_epoch bigint;
  window_start_ts timestamptz;
  current_count integer;
BEGIN
  IF p_identifier IS NULL OR btrim(p_identifier) = '' THEN
    RETURN jsonb_build_object('allowed', false, 'count', 0, 'limit', p_limit);
  END IF;

  IF p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    p_window_seconds := 60;
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 1;
  END IF;

  window_epoch := floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds;
  window_start_ts := to_timestamp(window_epoch);

  INSERT INTO public.request_rate_limits (identifier, window_start, count)
  VALUES (p_identifier, window_start_ts, 1)
  ON CONFLICT (identifier, window_start)
  DO UPDATE SET
    count = public.request_rate_limits.count + 1,
    updated_at = now()
  RETURNING count INTO current_count;

  RETURN jsonb_build_object(
    'allowed', current_count <= p_limit,
    'count', current_count,
    'limit', p_limit,
    'window_start', window_start_ts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;

-- Replay protection table for webhooks.
CREATE TABLE IF NOT EXISTS public.webhook_event_dedup (
  provider text NOT NULL,
  event_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_key)
);

ALTER TABLE public.webhook_event_dedup ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.register_webhook_event(
  p_provider text,
  p_event_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_provider IS NULL OR btrim(p_provider) = '' OR p_event_key IS NULL OR btrim(p_event_key) = '' THEN
    RETURN false;
  END IF;

  INSERT INTO public.webhook_event_dedup (provider, event_key)
  VALUES (p_provider, p_event_key)
  ON CONFLICT DO NOTHING;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.register_webhook_event(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_webhook_event(text, text) TO service_role;

