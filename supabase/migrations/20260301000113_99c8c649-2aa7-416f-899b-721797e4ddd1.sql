
-- Habilitar extensao pg_trgm (para busca por nome)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- RPC com LEFT JOIN LATERAL para garantir 1 row por produto
CREATE OR REPLACE FUNCTION admin_products_list(
  p_search text DEFAULT '',
  p_collection_id uuid DEFAULT NULL,
  p_limit int DEFAULT 25,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, name text, slug text, sku text, retail_price numeric,
  stock int, is_active boolean, badge text, status text,
  updated_at timestamptz, thumbnail text,
  variants_count bigint, price_rules_count bigint,
  collections jsonb, total_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT
    p.id, p.name, p.slug, p.sku, p.retail_price,
    p.stock, p.is_active, p.badge, p.status,
    p.updated_at, p.images[1] AS thumbnail,
    COALESCE(v.cnt, 0) AS variants_count,
    COALESCE(pr.cnt, 0) AS price_rules_count,
    COALESCE(c.arr, '[]'::jsonb) AS collections,
    COUNT(*) OVER() AS total_count
  FROM products p
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM product_variants WHERE product_id = p.id
  ) v ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM price_rules WHERE product_id = p.id AND is_active
  ) pr ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('id', col.id, 'name', col.name)) AS arr
    FROM collection_products cp
    JOIN collections col ON col.id = cp.collection_id
    WHERE cp.product_id = p.id
  ) c ON true
  WHERE
    (p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.sku ILIKE '%' || p_search || '%')
    AND (p_collection_id IS NULL OR EXISTS (
      SELECT 1 FROM collection_products cp2 WHERE cp2.product_id = p.id AND cp2.collection_id = p_collection_id
    ))
  ORDER BY p.updated_at DESC, p.id DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Indices
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_updated_id ON products (updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_collection_products_cid_pid ON collection_products (collection_id, product_id);
