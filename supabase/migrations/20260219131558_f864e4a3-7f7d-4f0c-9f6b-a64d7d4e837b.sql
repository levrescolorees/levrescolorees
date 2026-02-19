
-- =============================================
-- FASE 2: Orders, Customers, Order Status History
-- =============================================

-- Order status enum
CREATE TYPE public.order_status AS ENUM (
  'pendente', 'confirmado', 'preparando', 'enviado', 'entregue', 'cancelado'
);

-- Customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  cpf text NOT NULL DEFAULT '',
  cnpj text DEFAULT NULL,
  company_name text DEFAULT NULL,
  is_reseller boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_customers_email ON public.customers (email) WHERE email <> '';

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view customers" ON public.customers FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert customers" ON public.customers FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update customers" ON public.customers FOR UPDATE USING (is_staff(auth.uid()));
-- Also allow anonymous inserts from checkout (public)
CREATE POLICY "Public can insert customers at checkout" ON public.customers FOR INSERT WITH CHECK (true);

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number serial,
  customer_id uuid REFERENCES public.customers(id),
  status order_status NOT NULL DEFAULT 'pendente',
  subtotal numeric NOT NULL DEFAULT 0,
  shipping numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'pix',
  tracking_code text DEFAULT NULL,
  notes text DEFAULT NULL,
  shipping_address jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view orders" ON public.orders FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Public can insert orders at checkout" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view own order" ON public.orders FOR SELECT USING (true);

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_orders_status ON public.orders (status);
CREATE INDEX idx_orders_customer ON public.orders (customer_id);
CREATE INDEX idx_orders_created ON public.orders (created_at DESC);

-- Order items table
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  product_name text NOT NULL DEFAULT '',
  variant_name text DEFAULT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view order items" ON public.order_items FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Public can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view own order items" ON public.order_items FOR SELECT USING (true);

CREATE INDEX idx_order_items_order ON public.order_items (order_id);

-- Order status history
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  note text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view status history" ON public.order_status_history FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert status history" ON public.order_status_history FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Public can insert initial status" ON public.order_status_history FOR INSERT WITH CHECK (true);
