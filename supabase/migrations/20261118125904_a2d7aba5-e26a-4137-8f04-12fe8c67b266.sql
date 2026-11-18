-- 1. Tenants
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tenants (id, name, slug) VALUES ('00000000-0000-0000-0000-000000000001', 'Matriz', 'matriz');

-- 2. Colunas
ALTER TABLE public.profiles ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.customers ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001';
UPDATE public.customers SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.customers ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.manual_orders ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.manual_orders SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.manual_orders ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX idx_manual_orders_tenant ON public.manual_orders(tenant_id, status, created_at);

-- 3. Funções
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.is_global_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff(auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.get_current_tenant_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_global_staff() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_global_staff() TO authenticated;

-- Bloqueia troca de tenant pelo próprio usuário
CREATE OR REPLACE FUNCTION public.protect_profile_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Não é permitido alterar a filial';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_protect_profile_tenant BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_tenant();

-- 4. Políticas
CREATE POLICY "View tenants" ON public.tenants FOR SELECT TO authenticated
USING (public.is_global_staff() OR id = public.get_current_tenant_id());
CREATE POLICY "Admins manage tenants insert" ON public.tenants FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage tenants update" ON public.tenants FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- gerente vê perfis da própria filial
CREATE POLICY "Gerente views tenant profiles" ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'gerente') AND tenant_id = public.get_current_tenant_id());

DROP POLICY "Sales can view customers" ON public.customers;
DROP POLICY "Sales can create customers" ON public.customers;
CREATE POLICY "Tenant users view customers" ON public.customers FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['vendedor','expedicao','gerente']::app_role[]) AND tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant users create customers" ON public.customers FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['vendedor','gerente']::app_role[]) AND tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant users update customers" ON public.customers FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['vendedor','gerente']::app_role[]) AND tenant_id = public.get_current_tenant_id())
WITH CHECK (tenant_id = public.get_current_tenant_id());
GRANT UPDATE ON public.customers TO authenticated;

DROP POLICY "View manual orders" ON public.manual_orders;
DROP POLICY "View manual order items" ON public.manual_order_items;
DROP POLICY "View manual order history" ON public.manual_order_status_history;

CREATE POLICY "View manual orders" ON public.manual_orders FOR SELECT TO authenticated
USING (public.is_global_staff() OR (tenant_id = public.get_current_tenant_id() AND (
  public.has_any_role(auth.uid(), ARRAY['expedicao','gerente']::app_role[]) OR created_by = auth.uid())));
CREATE POLICY "View manual order items" ON public.manual_order_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.manual_orders o WHERE o.id = order_id));
CREATE POLICY "View manual order history" ON public.manual_order_status_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.manual_orders o WHERE o.id = order_id));
-- Escrita nessas tabelas: só via RPC (sem grants de INSERT/UPDATE/DELETE para authenticated).

-- 5. RPCs
CREATE OR REPLACE FUNCTION public.create_manual_order(p_customer_id uuid, p_items jsonb, p_attachment_path text, p_attachment_name text, p_notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_item jsonb; v_total numeric := 0; v_pname text; v_vname text; v_tenant uuid; v_cust_tenant uuid;
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','operador','vendedor','gerente']::app_role[]) THEN
    RAISE EXCEPTION 'Sem permissão para criar pedidos';
  END IF;
  v_tenant := public.get_current_tenant_id();
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Usuário sem filial'; END IF;
  IF p_attachment_path IS NULL OR p_attachment_path = '' THEN RAISE EXCEPTION 'Anexo obrigatório'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Adicione ao menos um item'; END IF;
  SELECT tenant_id INTO v_cust_tenant FROM customers WHERE id = p_customer_id;
  IF v_cust_tenant IS NULL THEN RAISE EXCEPTION 'Cliente inválido'; END IF;
  IF NOT public.is_global_staff() THEN
    IF v_cust_tenant <> v_tenant THEN RAISE EXCEPTION 'Cliente de outra filial'; END IF;
    IF split_part(p_attachment_path, '/', 1) <> v_tenant::text THEN RAISE EXCEPTION 'Anexo inválido'; END IF;
  ELSE
    v_tenant := v_cust_tenant; -- admin cria o pedido na filial do cliente
  END IF;

  INSERT INTO manual_orders (customer_id, attachment_path, attachment_name, notes, created_by, tenant_id)
  VALUES (p_customer_id, p_attachment_path, COALESCE(p_attachment_name,''), COALESCE(p_notes,''), auth.uid(), v_tenant)
  RETURNING id INTO v_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF (v_item->>'quantity')::int <= 0 OR (v_item->>'unit_price')::numeric < 0 THEN RAISE EXCEPTION 'Quantidade/preço inválido'; END IF;
    SELECT name INTO v_pname FROM products WHERE id = (v_item->>'product_id')::uuid;
    IF v_pname IS NULL THEN RAISE EXCEPTION 'Produto inválido'; END IF;
    v_vname := NULL;
    IF NULLIF(v_item->>'variant_id','') IS NOT NULL THEN
      SELECT name INTO v_vname FROM product_variants WHERE id = (v_item->>'variant_id')::uuid AND product_id = (v_item->>'product_id')::uuid;
      IF v_vname IS NULL THEN RAISE EXCEPTION 'Variação inválida'; END IF;
    END IF;
    INSERT INTO manual_order_items (order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price)
    VALUES (v_id, (v_item->>'product_id')::uuid, NULLIF(v_item->>'variant_id','')::uuid, v_pname, v_vname, (v_item->>'quantity')::int, (v_item->>'unit_price')::numeric);
    v_total := v_total + (v_item->>'quantity')::int * (v_item->>'unit_price')::numeric;
  END LOOP;

  UPDATE manual_orders SET total = v_total WHERE id = v_id;
  INSERT INTO manual_order_status_history (order_id, from_status, to_status, changed_by) VALUES (v_id, NULL, 'recebido', auth.uid());
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.set_manual_order_status(p_order_id uuid, p_status public.manual_order_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cur manual_order_status; v_tenant uuid; v_admin boolean;
BEGIN
  v_admin := public.has_role(auth.uid(), 'admin');
  IF NOT (v_admin OR public.has_any_role(auth.uid(), ARRAY['operador','expedicao','gerente']::app_role[])) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT status, tenant_id INTO v_cur, v_tenant FROM manual_orders WHERE id = p_order_id FOR UPDATE;
  IF v_cur IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT public.is_global_staff() AND v_tenant <> public.get_current_tenant_id() THEN RAISE EXCEPTION 'Pedido de outra filial'; END IF;
  IF v_cur = p_status THEN RETURN; END IF;
  IF NOT v_admin AND NOT ((v_cur = 'recebido' AND p_status = 'em_separacao') OR (v_cur = 'em_separacao' AND p_status = 'despachado')) THEN
    RAISE EXCEPTION 'Transição de status não permitida';
  END IF;
  UPDATE manual_orders SET status = p_status, assigned_to = CASE WHEN p_status = 'em_separacao' THEN auth.uid() ELSE assigned_to END WHERE id = p_order_id;
  INSERT INTO manual_order_status_history (order_id, from_status, to_status, changed_by) VALUES (p_order_id, v_cur, p_status, auth.uid());
END $$;

-- 6. Storage por filial
DROP POLICY "Sales upload purchase orders" ON storage.objects;
DROP POLICY "Team reads purchase orders" ON storage.objects;
CREATE POLICY "Upload purchase orders by tenant" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'purchase-orders' AND (
  public.has_any_role(auth.uid(), ARRAY['admin','operador']::app_role[])
  OR (public.has_any_role(auth.uid(), ARRAY['vendedor','gerente']::app_role[]) AND (storage.foldername(name))[1] = public.get_current_tenant_id()::text)));
CREATE POLICY "Read purchase orders by tenant" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'purchase-orders' AND (
  public.is_global_staff()
  OR (public.has_any_role(auth.uid(), ARRAY['vendedor','expedicao','gerente']::app_role[]) AND (
    (storage.foldername(name))[1] = public.get_current_tenant_id()::text
    OR EXISTS (SELECT 1 FROM public.manual_orders o WHERE o.attachment_path = name AND o.tenant_id = public.get_current_tenant_id())))));