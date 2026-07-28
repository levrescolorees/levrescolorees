INSERT INTO public.collections (name, slug, description, collection_type, sort_order, is_active)
VALUES ('Ruby Rose / Melu', 'ruby-rose-melu', 'Produtos Ruby Rose e Melu', 'manual', 10, true)
ON CONFLICT (slug) DO NOTHING;