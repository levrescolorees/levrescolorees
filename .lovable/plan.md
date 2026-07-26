
# Auditoria de Performance — Lèvres Colorées

Objetivo: reduzir tempo de carregamento inicial, eliminar travamentos ao navegar e cortar re-renders/queries desnecessárias, tanto na loja quanto no painel admin.

## Problemas identificados

**Bundle & carregamento**
- `vite.config.ts` não faz manualChunks — tudo (Radix, Recharts, Framer Motion, Embla, react-easy-crop, react-day-picker) vai num bundle único.
- Rotas admin usam `import` direto (não lazy), então quem abre a loja baixa Dashboard, Recharts, ProductForm, ThemeEditor, etc.
- `framer-motion` (~120 kB) e `recharts` (~300 kB) carregados em rotas que não precisam.
- Sem preconnect para Supabase/fontes; sem preload da imagem LCP do hero.
- `hero-banner.jpg` = 299 kB (sem AVIF/WebP), PDFs de logo (760 kB) em `src/assets` desnecessários no bundle.
- `<title>` genérico "levres" e `og:description` "Lovable Generated Project".

**Queries & dados**
- `useStorefrontProducts` traz TODOS os produtos + variantes + price_rules + collection_products em toda página que usa (Index, Collections, ProductDetail via CartContext, etc.). Sem paginação, sem `select` de colunas específicas — puxa `description` inteiro de todo produto.
- `FeaturedProducts` chama `useStorefrontProducts` só para filtrar 4 destaques.
- `ProductDetail` não usa o cache do listing — refaz query por slug.
- Sem índices dedicados? Verificar `products(is_active, created_at)`, `product_variants(product_id, sort_order)`, `price_rules(product_id, is_active)`, `collection_products(product_id)`.
- Admin `useAdminProducts` (sem paginação) coexiste com `useAdminProductsList` (paginado). Precisa remover chamadas do não-paginado.

**Renderização**
- `Index` renderiza `HeroBanner` + `BenefitsSection` + `FeaturedProducts` sem LazySection, mas o resto usa `useLazySection('200px')` — ok.
- `ProductCard` usa `useAnimateOnView` com delay `index*100` — ok.
- `ThemeProvider` provavelmente reaplica CSS vars a cada render — validar.
- Falta `React.memo` em `ProductCard` e memoização do filtro em `Collections`.

**Imagens**
- Imagens de produto vindas do Supabase Storage sem transformação (sem `?width=`), sem `srcSet`, sem `decoding="async"`, sem `fetchpriority` no LCP.
- Swatches carregados todos de uma vez no `ColorSwatchPicker`.

**CSS/Fonts**
- CSP permite `fonts.googleapis.com` mas não há `<link rel="preconnect">` — cada fonte custa handshake.

## Plano de ação

### 1. Bundle & code-splitting
- Adicionar `manualChunks` em `vite.config.ts`: `react-vendor`, `radix`, `charts` (recharts), `motion` (framer), `carousel` (embla), `supabase`, `forms` (react-hook-form + zod).
- Converter TODAS as rotas admin em `lazy()` em `src/App.tsx` (Dashboard, Products, ProductForm, AdminOrders, OrderDetail, AdminCustomers, AdminCoupons, AdminSettings, AdminMedia, AdminIntegrations*, AdminThemeEditor, AdminCollections).
- Lazy-load `ProfitCalculator`, `CartDrawer`, `WhatsAppButton`, `ThemeEditor`, `HeroSlidesEditor`, `ImageCropModal`.
- Trocar imports de `framer-motion` por versão pontual (`import { motion } from "framer-motion"`) e remover onde só há fade CSS (Login, ProductCard).
- Remover `logo-bg.pdf` e `logo-text.pdf` de `src/assets` (não são importados como asset web).

### 2. HTML head
- Corrigir `<title>` para "Lèvres Colorées — Cosméticos" e `og:description` real.
- Adicionar `<link rel="preconnect" href="https://jefuidilwgzsnifjgdaf.supabase.co">` e `preconnect` para fonts.
- Adicionar `<link rel="preload" as="image">` para a primeira imagem do hero (via slide desktop salvo).

### 3. Queries Supabase
- `useStorefrontProducts`: `select` explícito das colunas necessárias para listagem (sem `description` longo); manter cache 5min.
- Novo hook `useFeaturedProducts` que chama endpoint reduzido (só produtos com badge 'Mais Vendido', limit 4).
- `useProductBySlug`: já ok, adicionar `select` explícito.
- Substituir usos remanescentes de `useAdminProducts` por `useAdminProductsList`.
- Migração SQL: criar índices se ausentes — `products(is_active, created_at DESC)`, `product_variants(product_id, sort_order)`, `price_rules(product_id, is_active)`, `collection_products(product_id)`, `orders(created_at DESC)`, `orders(customer_id)`.
- Rodar `supabase--slow_queries` para confirmar hotspots antes/depois.

### 4. Imagens
- Utilitário `getStorageImage(url, {width, quality})` usando o Supabase Image Transformation (`?width=…&quality=75`).
- `ProductCard`: `srcSet` (400/800), `sizes`, `loading="lazy"`, `decoding="async"`; primeiro card acima da dobra recebe `fetchpriority="high"`.
- `HeroBanner`: usar `<picture>` com `fetchpriority="high"` no primeiro slide, `loading="lazy"` nos demais.
- `ColorSwatchPicker`: `loading="lazy"` em todos os swatches; renderizar só a família ativa depois de troca (já filtra — reforçar).

### 5. Render/estado
- `React.memo` em `ProductCard`, `ColorSwatchPicker`.
- `useMemo` no filtro de coleções em `Collections.tsx` e no cálculo de `featured`.
- Revisar `ThemeProvider` para aplicar CSS vars só quando `settings` mudar (deps corretas).
- Retirar `useAnimateOnView` de acima-da-dobra para não bloquear paint.

### 6. React Query
- Setar `gcTime: 30min`, manter `staleTime: 30s` global; hooks de catálogo em 5min.
- Ativar `refetchOnReconnect: false` onde faz sentido.

### 7. Medição
- Antes/depois: `du -sh dist/assets/*.js | sort -h`, contagem de chunks, tamanhos gzip.
- Rodar `slow_queries` no Supabase para validar índices.

## Detalhes técnicos (para referência)

```text
vite.config.ts
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react","react-dom","react-router-dom"],
          "radix": [/* todos @radix-ui/* usados */],
          "charts": ["recharts"],
          "motion": ["framer-motion"],
          "carousel": ["embla-carousel-react","embla-carousel-autoplay"],
          "supabase": ["@supabase/supabase-js","@tanstack/react-query"],
          "forms": ["react-hook-form","@hookform/resolvers","zod"],
        }
      }
    }
  }
```

Fora de escopo: reescrever design, mudar stack, alterar regras de negócio, mexer em edge functions (checkout, MP, SuperFrete, email-worker permanecem como estão).
