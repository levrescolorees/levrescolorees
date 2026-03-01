

## Plano Premium de Performance — 3 Frentes

### Fase 1: Admin Product List — RPC agregada + Paginacao + Skeletons

**1.1 Migration: RPC `admin_products_list` + indices**

```sql
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
```

**1.2 Novo hook `useAdminProductsList`** em `src/hooks/useProducts.ts`
- Chama `supabase.rpc('admin_products_list', { p_search, p_collection_id, p_limit, p_offset })`
- `useQuery` com `keepPreviousData: true`, `staleTime: 60_000`
- Retorna `{ data, totalCount, isLoading, isPlaceholderData }`
- Estado local de `page` e `pageSize` (25)

**1.3 Atualizar `Products.tsx`**
- Substituir `useAdminProducts()` por `useAdminProductsList(search, filterCollectionId, page)`
- Debounce no search (300ms) para evitar queries a cada tecla
- Skeleton rows (6 linhas de `<Skeleton>`) durante `isLoading && !data`
- Controles de paginacao no rodape (Anterior/Proximo + "Mostrando X-Y de Z")
- Manter toda a logica de bulk actions, CSV, etc. (operam sobre `selectedIds` que ja existem)

---

### Fase 2: Storefront — Lazy Sections + Cache Longo + Motion Leve

**2.1 Novo hook `useLazySection`** em `src/hooks/useLazySection.ts`
- Usa `IntersectionObserver` com `rootMargin: '200px'`
- Retorna `{ ref, isVisible }` — componente so renderiza quando `isVisible`

**2.2 `Index.tsx` — envolver secoes abaixo da dobra**
- `CollectionsSection`, `TestimonialsSection`, `FinalCTA` envolvidos com `useLazySection`
- Hero + BenefitsSection + FeaturedProducts renderizam imediato (above the fold)

**2.3 Cache mais longo**
- `useStorefrontProducts`: `staleTime: 5 * 60_000` (5 min)
- `useCollections`: `staleTime: 5 * 60_000`
- `useStoreSettings`: `staleTime: 10 * 60_000` (10 min)

**2.4 CSS transitions em vez de Framer Motion abaixo da dobra**
- `ProductCard`: substituir `motion.div` por `div` com classes CSS (`opacity-0 translate-y-5 transition-all duration-500`) + IntersectionObserver para adicionar classe `opacity-100 translate-y-0`
- `CollectionsSection`, `TestimonialsSection`, `SmartPricingSection`: mesmo padrao — CSS transitions
- `HeroBanner`: manter Framer Motion (above the fold, animacao de entrada unica)
- `ProductCard` button: substituir `motion.button` por `button` com `hover:scale-105 active:scale-95 transition-transform`

---

### Fase 3: Dashboard — Skeletons por Bloco

**3.1 Skeleton KPI cards**
- Cada card mostra `<Skeleton className="h-8 w-24" />` no valor enquanto sua query especifica esta carregando
- Cards com layout fixo (nunca mudam de tamanho)

**3.2 Skeleton graficos**
- Area do bar chart: `<Skeleton className="h-56 w-full rounded-lg" />`
- Area do pie chart: `<Skeleton className="h-56 w-full rounded-lg" />`

**3.3 `placeholderData` nas queries**
- Adicionar `placeholderData: (prev) => prev` nas 4 queries do Dashboard para manter dados visiveis durante revalidacao

---

### Resumo de arquivos

| Arquivo | Mudanca |
|---|---|
| `supabase/migrations/` | RPC `admin_products_list` + 3 indices |
| `src/hooks/useProducts.ts` | `useAdminProductsList` hook + staleTime storefront |
| `src/hooks/useLazySection.ts` | Novo hook IntersectionObserver |
| `src/pages/admin/Products.tsx` | Novo hook, skeletons, paginacao, debounce search |
| `src/pages/admin/Dashboard.tsx` | Skeletons por card/grafico, `placeholderData` |
| `src/pages/Index.tsx` | Lazy sections abaixo da dobra |
| `src/components/ProductCard.tsx` | CSS transitions (remover framer-motion) |
| `src/components/CollectionsSection.tsx` | CSS transitions |
| `src/components/TestimonialsSection.tsx` | CSS transitions |
| `src/components/SmartPricingSection.tsx` | CSS transitions |
| `src/hooks/useStoreSettings.ts` | staleTime 10 min |

