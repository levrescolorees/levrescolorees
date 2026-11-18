CREATE TYPE public.manual_order_status AS ENUM ('recebido','em_separacao','despachado');

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated;

CREATE SEQUENCE public.manual_order_number_seq START 1001;

CREATE TABLE public.manual_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number integer NOT NULL DEFAULT nextval('public.manual_order_number_seq') UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  status public.manual_order_status NOT NULL DEFAULT 'recebido',
  attachment_path text NOT NULL,
  attachment_name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  total numeric NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_manual_orders_status_created ON public.manual_orders(status, created_at);

CREATE TABLE public.manual_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.manual_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant_name text,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_manual_order_items_order ON public.manual_order_items(order_id);

CREATE TABLE public.manual_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.manual_orders(id) ON DELETE CASCADE,
  from_status public.manual_order_status,
  to_status public.manual_order_status NOT NULL,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.manual_orders, public.manual_order_items, public.manual_order_status_history TO authenticated;
GRANT ALL ON public.manual_orders, public.manual_order_items, public.manual_order_status_history TO service_role;

ALTER TABLE public.manual_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View manual orders" ON public.manual_orders FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','operador','expedicao']::app_role[]) OR created_by = auth.uid());

CREATE POLICY "View manual order items" ON public.manual_order_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.manual_orders o WHERE o.id = order_id AND
  (public.has_any_role(auth.uid(), ARRAY['admin','operador','expedicao']::app_role[]) OR o.created_by = auth.uid())));

CREATE POLICY "View manual order history" ON public.manual_order_status_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.manual_orders o WHERE o.id = order_id AND
  (public.has_any_role(auth.uid(), ARRAY['admin','operador','expedicao']::app_role[]) OR o.created_by = auth.uid())));

CREATE TRIGGER update_manual_orders_updated_at BEFORE UPDATE ON public.manual_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vendedor/expedição precisam ler clientes; vendedor pode cadastrar
CREATE POLICY "Sales can view customers" ON public.customers FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['vendedor','expedicao']::app_role[]));
CREATE POLICY "Sales can create customers" ON public.customers FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','operador','vendedor']::app_role[]));
GRANT SELECT, INSERT ON public.customers TO authenticated;

-- Criação atômica
CREATE OR REPLACE FUNCTION public.create_manual_order(p_customer_id uuid, p_items jsonb, p_attachment_path text, p_attachment_name text, p_notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_item jsonb; v_total numeric := 0; v_pname text; v_vname text;
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','operador','vendedor']::app_role[]) THEN
    RAISE EXCEPTION 'Sem permissão para criar pedidos';
  END IF;
  IF p_attachment_path IS NULL OR p_attachment_path = '' THEN RAISE EXCEPTION 'Anexo obrigatório'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Adicione ao menos um item'; END IF;
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = p_customer_id) THEN RAISE EXCEPTION 'Cliente inválido'; END IF;

  INSERT INTO manual_orders (customer_id, attachment_path, attachment_name, notes, created_by)
  VALUES (p_customer_id, p_attachment_path, COALESCE(p_attachment_name,''), COALESCE(p_notes,''), auth.uid())
  RETURNING id INTO v_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF (v_item->>'quantity')::int <= 0 OR (v_item->>'unit_price')::numeric < 0 THEN
      RAISE EXCEPTION 'Quantidade/preço inválido';
    END IF;
    SELECT name INTO v_pname FROM products WHERE id = (v_item->>'product_id')::uuid;
    IF v_pname IS NULL THEN RAISE EXCEPTION 'Produto inválido'; END IF;
    v_vname := NULL;
    IF NULLIF(v_item->>'variant_id','') IS NOT NULL THEN
      SELECT name INTO v_vname FROM product_variants WHERE id = (v_item->>'variant_id')::uuid AND product_id = (v_item->>'product_id')::uuid;
      IF v_vname IS NULL THEN RAISE EXCEPTION 'Variação inválida'; END IF;
    END IF;
    INSERT INTO manual_order_items (order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price)
    VALUES (v_id, (v_item->>'product_id')::uuid, NULLIF(v_item->>'variant_id','')::uuid, v_pname, v_vname,
            (v_item->>'quantity')::int, (v_item->>'unit_price')::numeric);
    v_total := v_total + (v_item->>'quantity')::int * (v_item->>'unit_price')::numeric;
  END LOOP;

  UPDATE manual_orders SET total = v_total WHERE id = v_id;
  INSERT INTO manual_order_status_history (order_id, from_status, to_status, changed_by) VALUES (v_id, NULL, 'recebido', auth.uid());
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_manual_order(uuid, jsonb, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_manual_order(uuid, jsonb, text, text, text) TO authenticated;

-- Avançar / voltar status
CREATE OR REPLACE FUNCTION public.set_manual_order_status(p_order_id uuid, p_status public.manual_order_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cur manual_order_status; v_admin boolean;
BEGIN
  v_admin := public.has_any_role(auth.uid(), ARRAY['admin']::app_role[]);
  IF NOT (v_admin OR public.has_any_role(auth.uid(), ARRAY['operador','expedicao']::app_role[])) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  SELECT status INTO v_cur FROM manual_orders WHERE id = p_order_id FOR UPDATE;
  IF v_cur IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF v_cur = p_status THEN RETURN; END IF;
  IF NOT v_admin AND NOT ((v_cur = 'recebido' AND p_status = 'em_separacao') OR (v_cur = 'em_separacao' AND p_status = 'despachado')) THEN
    RAISE EXCEPTION 'Transição de status não permitida';
  END IF;
  UPDATE manual_orders SET status = p_status,
    assigned_to = CASE WHEN p_status = 'em_separacao' THEN auth.uid() ELSE assigned_to END
  WHERE id = p_order_id;
  INSERT INTO manual_order_status_history (order_id, from_status, to_status, changed_by) VALUES (p_order_id, v_cur, p_status, auth.uid());
END $$;
REVOKE EXECUTE ON FUNCTION public.set_manual_order_status(uuid, public.manual_order_status) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_manual_order_status(uuid, public.manual_order_status) TO authenticated;

-- Storage
CREATE POLICY "Sales upload purchase orders" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'purchase-orders' AND public.has_any_role(auth.uid(), ARRAY['admin','operador','vendedor']::app_role[]));
CREATE POLICY "Team reads purchase orders" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'purchase-orders' AND public.has_any_role(auth.uid(), ARRAY['admin','operador','vendedor','expedicao']::app_role[]));
CREATE POLICY "Uploader deletes purchase orders" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'purchase-orders' AND owner = auth.uid());