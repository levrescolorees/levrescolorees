
-- Storefront/admin listagem
CREATE INDEX IF NOT EXISTS idx_products_active_created ON public.products (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_badge_active ON public.products (badge, is_active) WHERE badge IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);

-- Variantes
CREATE INDEX IF NOT EXISTS idx_variants_product_sort ON public.product_variants (product_id, sort_order);

-- Price rules
CREATE INDEX IF NOT EXISTS idx_price_rules_product_active ON public.price_rules (product_id, is_active);

-- Coleções
CREATE INDEX IF NOT EXISTS idx_collection_products_product ON public.collection_products (product_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_collection ON public.collection_products (collection_id);

-- Pedidos (dashboard e listagens)
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers (email);
