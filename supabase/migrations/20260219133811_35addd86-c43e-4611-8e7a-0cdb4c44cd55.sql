
-- ==========================================
-- FASE 3: Cupons, Frete, Store Settings
-- ==========================================

-- 1. COUPONS
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_value numeric NOT NULL DEFAULT 0,
  max_uses integer DEFAULT NULL,
  used_count integer NOT NULL DEFAULT 0,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL DEFAULT NULL,
  first_purchase_only boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coupons are publicly readable" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Admin/Operador can insert coupons" ON public.coupons FOR INSERT WITH CHECK (is_admin_or_operador(auth.uid()));
CREATE POLICY "Admin/Operador can update coupons" ON public.coupons FOR UPDATE USING (is_admin_or_operador(auth.uid()));
CREATE POLICY "Admin/Operador can delete coupons" ON public.coupons FOR DELETE USING (is_admin_or_operador(auth.uid()));

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. SHIPPING RULES
CREATE TABLE public.shipping_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  rule_type text NOT NULL DEFAULT 'fixed' CHECK (rule_type IN ('fixed', 'by_state', 'free_above')),
  value numeric NOT NULL DEFAULT 0,
  state text DEFAULT NULL,
  min_order_for_free numeric DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shipping rules are publicly readable" ON public.shipping_rules FOR SELECT USING (true);
CREATE POLICY "Admin/Operador can insert shipping rules" ON public.shipping_rules FOR INSERT WITH CHECK (is_admin_or_operador(auth.uid()));
CREATE POLICY "Admin/Operador can update shipping rules" ON public.shipping_rules FOR UPDATE USING (is_admin_or_operador(auth.uid()));
CREATE POLICY "Admin/Operador can delete shipping rules" ON public.shipping_rules FOR DELETE USING (is_admin_or_operador(auth.uid()));

-- 3. STORE SETTINGS (key/value JSON)
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store settings are publicly readable" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admin can insert store settings" ON public.store_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update store settings" ON public.store_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete store settings" ON public.store_settings FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default store settings
INSERT INTO public.store_settings (key, value) VALUES
  ('brand', '{"name": "Lèvres Colorées", "tagline": "Beleza que transforma"}'),
  ('hero', '{"headline": "Beleza Premium para Revenda", "subheadline": "Produtos de alta qualidade com margens incríveis para seu negócio", "cta_text": "Ver Produtos", "cta_link": "/colecoes"}'),
  ('shipping', '{"default_type": "fixed", "default_value": 15.90, "free_above": 199}');
