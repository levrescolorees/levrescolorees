
-- =============================================
-- FASE 1: Schema completo para Lèvres Colorées
-- =============================================

-- 1. Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operador', 'financeiro');

-- 2. Tabela profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 4. Tabela products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  retail_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  images TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stock INTEGER NOT NULL DEFAULT 0,
  badge TEXT,
  ideal_for_resale BOOLEAN NOT NULL DEFAULT false,
  suggested_margin NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabela product_variants
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  price_override NUMERIC(10,2),
  stock INTEGER NOT NULL DEFAULT 0,
  images TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tabela price_rules (precificação escalonada)
CREATE TABLE public.price_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  min_quantity INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Tabela collections
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image TEXT,
  collection_type TEXT NOT NULL DEFAULT 'manual',
  conditions JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Tabela collection_products (many-to-many)
CREATE TABLE public.collection_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (collection_id, product_id)
);

-- =============================================
-- SECURITY DEFINER FUNCTION: has_role()
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper: check admin or operador
CREATE OR REPLACE FUNCTION public.is_admin_or_operador(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'operador')
  )
$$;

-- Helper: check any staff role
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'operador', 'financeiro')
  )
$$;

-- =============================================
-- Trigger: auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Trigger: auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS POLICIES
-- =============================================

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- products (public read, admin/operador write)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are publicly readable"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Admin/Operador can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_operador(auth.uid()));

CREATE POLICY "Admin/Operador can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_operador(auth.uid()));

CREATE POLICY "Admin/Operador can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin_or_operador(auth.uid()));

-- product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variants are publicly readable"
  ON public.product_variants FOR SELECT
  USING (true);

CREATE POLICY "Admin/Operador can insert variants"
  ON public.product_variants FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_operador(auth.uid()));

CREATE POLICY "Admin/Operador can update variants"
  ON public.product_variants FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_operador(auth.uid()));

CREATE POLICY "Admin/Operador can delete variants"
  ON public.product_variants FOR DELETE
  TO authenticated
  USING (public.is_admin_or_operador(auth.uid()));

-- price_rules
ALTER TABLE public.price_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price rules are publicly readable"
  ON public.price_rules FOR SELECT
  USING (true);

CREATE POLICY "Admin/Operador can insert price rules"
  ON public.price_rules FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_operador(auth.uid()));

CREATE POLICY "Admin/Operador/Financeiro can update price rules"
  ON public.price_rules FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin/Operador can delete price rules"
  ON public.price_rules FOR DELETE
  TO authenticated
  USING (public.is_admin_or_operador(auth.uid()));

-- collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collections are publicly readable"
  ON public.collections FOR SELECT
  USING (true);

CREATE POLICY "Admin/Operador can insert collections"
  ON public.collections FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_operador(auth.uid()));

CREATE POLICY "Admin/Operador can update collections"
  ON public.collections FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_operador(auth.uid()));

CREATE POLICY "Admin/Operador can delete collections"
  ON public.collections FOR DELETE
  TO authenticated
  USING (public.is_admin_or_operador(auth.uid()));

-- collection_products
ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collection products are publicly readable"
  ON public.collection_products FOR SELECT
  USING (true);

CREATE POLICY "Admin/Operador can insert collection products"
  ON public.collection_products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_operador(auth.uid()));

CREATE POLICY "Admin/Operador can update collection products"
  ON public.collection_products FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_operador(auth.uid()));

CREATE POLICY "Admin/Operador can delete collection products"
  ON public.collection_products FOR DELETE
  TO authenticated
  USING (public.is_admin_or_operador(auth.uid()));

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_collections_slug ON public.collections(slug);
CREATE INDEX idx_price_rules_product ON public.price_rules(product_id);
CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX idx_collection_products_collection ON public.collection_products(collection_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- =============================================
-- STORAGE BUCKET for product images
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

CREATE POLICY "Product images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admin/Operador can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin_or_operador(auth.uid()));

CREATE POLICY "Admin/Operador can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin_or_operador(auth.uid()));

CREATE POLICY "Admin/Operador can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin_or_operador(auth.uid()));
