
-- 1) email_outbox table
CREATE TABLE public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_id text,
  to_email text NOT NULL,
  template_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 6,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL DEFAULT 'resend',
  provider_message_id text,
  last_error text,
  idempotency_key text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for worker polling
CREATE INDEX idx_email_outbox_queue ON public.email_outbox (status, next_attempt_at)
  WHERE status IN ('queued', 'sending');

-- Index for lookups by entity
CREATE INDEX idx_email_outbox_entity ON public.email_outbox (entity_id, event_type);

-- Updated_at trigger
CREATE TRIGGER set_email_outbox_updated_at
  BEFORE UPDATE ON public.email_outbox
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2) email_delivery_events table
CREATE TABLE public.email_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id uuid REFERENCES public.email_outbox(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_delivery_outbox ON public.email_delivery_events (outbox_id);

-- 3) RLS policies
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_events ENABLE ROW LEVEL SECURITY;

-- Staff can view outbox
CREATE POLICY "Staff can view email outbox"
  ON public.email_outbox FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

-- Staff can view delivery events
CREATE POLICY "Staff can view delivery events"
  ON public.email_delivery_events FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

-- Service role inserts (triggers run as superuser, edge functions use service_role)
-- No INSERT policy needed for anon/authenticated — triggers bypass RLS

-- 4) Trigger function: enqueue email on order status change
CREATE OR REPLACE FUNCTION public.enqueue_email_on_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer RECORD;
  v_idem_key text;
  v_payload jsonb;
BEGIN
  -- Only fire on actual status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Skip initial 'pendente' (handled by order_confirmed on payment)
  IF NEW.status = 'pendente' THEN
    RETURN NEW;
  END IF;

  -- Get customer info
  SELECT name, email INTO v_customer
  FROM customers WHERE id = NEW.customer_id;

  IF v_customer.email IS NULL OR v_customer.email = '' THEN
    RETURN NEW;
  END IF;

  v_idem_key := 'status_updated:' || NEW.id || ':' || NEW.status;

  v_payload := jsonb_build_object(
    'order_number', NEW.order_number,
    'new_status', NEW.status,
    'customer_name', v_customer.name,
    'order_id', NEW.id
  );

  INSERT INTO email_outbox (event_type, entity_id, to_email, template_key, payload, idempotency_key)
  VALUES ('status_updated', NEW.id::text, v_customer.email, 'status_updated', v_payload, v_idem_key)
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_email_order_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION enqueue_email_on_order_status();

-- 5) Trigger function: enqueue email on tracking code added
CREATE OR REPLACE FUNCTION public.enqueue_email_on_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer RECORD;
  v_idem_key text;
  v_payload jsonb;
BEGIN
  -- Only fire when tracking_code changes from null/empty to a value
  IF (OLD.tracking_code IS NOT NULL AND OLD.tracking_code != '') THEN
    RETURN NEW;
  END IF;
  IF (NEW.tracking_code IS NULL OR NEW.tracking_code = '') THEN
    RETURN NEW;
  END IF;

  SELECT name, email INTO v_customer
  FROM customers WHERE id = NEW.customer_id;

  IF v_customer.email IS NULL OR v_customer.email = '' THEN
    RETURN NEW;
  END IF;

  v_idem_key := 'tracking_sent:' || NEW.id || ':' || NEW.tracking_code;

  v_payload := jsonb_build_object(
    'order_number', NEW.order_number,
    'tracking_code', NEW.tracking_code,
    'customer_name', v_customer.name,
    'order_id', NEW.id
  );

  INSERT INTO email_outbox (event_type, entity_id, to_email, template_key, payload, idempotency_key)
  VALUES ('tracking_sent', NEW.id::text, v_customer.email, 'tracking_sent', v_payload, v_idem_key)
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_email_tracking
  AFTER UPDATE OF tracking_code ON public.orders
  FOR EACH ROW EXECUTE FUNCTION enqueue_email_on_tracking();

-- 6) Trigger function: enqueue email on payment approved
CREATE OR REPLACE FUNCTION public.enqueue_email_on_payment_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer RECORD;
  v_idem_key text;
  v_payload jsonb;
  v_items jsonb;
BEGIN
  -- Only fire when payment_status changes to 'approved'
  IF NEW.payment_status != 'approved' THEN
    RETURN NEW;
  END IF;
  IF OLD.payment_status = 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT name, email INTO v_customer
  FROM customers WHERE id = NEW.customer_id;

  IF v_customer.email IS NULL OR v_customer.email = '' THEN
    RETURN NEW;
  END IF;

  -- Get order items
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'product_name', oi.product_name,
    'variant_name', oi.variant_name,
    'quantity', oi.quantity,
    'unit_price', oi.unit_price,
    'total_price', oi.total_price
  )), '[]'::jsonb) INTO v_items
  FROM order_items oi WHERE oi.order_id = NEW.id;

  v_idem_key := 'order_confirmed:' || NEW.id;

  v_payload := jsonb_build_object(
    'order_number', NEW.order_number,
    'customer_name', v_customer.name,
    'items', v_items,
    'subtotal', NEW.subtotal,
    'shipping', NEW.shipping,
    'discount', NEW.discount,
    'total', NEW.total,
    'payment_method', NEW.payment_method,
    'shipping_address', NEW.shipping_address,
    'order_id', NEW.id
  );

  INSERT INTO email_outbox (event_type, entity_id, to_email, template_key, payload, idempotency_key)
  VALUES ('order_confirmed', NEW.id::text, v_customer.email, 'order_confirmed', v_payload, v_idem_key)
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_email_payment_approved
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION enqueue_email_on_payment_approved();

-- 7) Also trigger on INSERT for orders created with payment already approved (no-MP flow)
CREATE OR REPLACE FUNCTION public.enqueue_email_on_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer RECORD;
  v_idem_key text;
  v_payload jsonb;
BEGIN
  -- For new orders without MP (payment_status = 'pending'), we still want a confirmation
  -- This covers the no-MP scenario where create-payment doesn't set approved
  -- The order_confirmed email for approved payments is handled by trg_email_payment_approved
  -- Skip if payment_status is already 'approved' (will be caught by update trigger)
  IF NEW.payment_status = 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT name, email INTO v_customer
  FROM customers WHERE id = NEW.customer_id;

  IF v_customer.email IS NULL OR v_customer.email = '' THEN
    RETURN NEW;
  END IF;

  v_idem_key := 'order_confirmed:' || NEW.id;

  v_payload := jsonb_build_object(
    'order_number', NEW.order_number,
    'customer_name', v_customer.name,
    'subtotal', NEW.subtotal,
    'shipping', NEW.shipping,
    'discount', NEW.discount,
    'total', NEW.total,
    'payment_method', NEW.payment_method,
    'shipping_address', NEW.shipping_address,
    'order_id', NEW.id
  );

  -- Note: items not available at INSERT time (inserted after order), worker will fetch them
  INSERT INTO email_outbox (event_type, entity_id, to_email, template_key, payload, idempotency_key)
  VALUES ('order_confirmed', NEW.id::text, v_customer.email, 'order_confirmed', v_payload, v_idem_key)
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_email_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION enqueue_email_on_order_created();
