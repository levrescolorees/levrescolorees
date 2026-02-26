

## Auditoria de Performance, Reliability e QA

---

### 1) TOP 10 GARGALOS E BUGS

| # | Impacto | Freq | Facilidade | Onde | Sintoma | Causa | Reproducao | Metrica |
|---|---------|------|------------|------|---------|-------|------------|---------|
| 1 | **Alta** | Sempre | Facil | `App.tsx` — todas as rotas | Bundle monolitico, todas as 15+ rotas carregadas de uma vez | Nenhuma rota usa `React.lazy()` | Abrir DevTools > Network, verificar tamanho do JS inicial | Bundle size (KB), LCP |
| 2 | **Alta** | Sempre | Facil | `ProductDetail.tsx:15` | Pagina de detalhe carrega TODOS os produtos ativos para mostrar 4 relacionados | `useStorefrontProducts()` busca tudo (produtos + variants + priceRules + collections) para cada produto | Abrir qualquer produto, ver Network tab — query pesada desnecessaria | Tempo da query, bytes transferidos |
| 3 | **Alta** | Sempre | Facil | `Cart.tsx:14` | Pagina de carrinho tambem carrega todos os produtos para upsell de 4 itens | Mesmo que #2 | Abrir /carrinho, ver Network | Waterfall timing |
| 4 | **Alta** | Sempre | Media | `useStorefrontProducts` / `useAdminProducts` | N+1 query: busca produtos, depois 3 queries paralelas para variants, priceRules e collectionProducts — filtrando client-side com `.filter()` | Nao usa JOIN no Supabase (`select('*, product_variants(*), price_rules(*)')`) | Ter 50+ produtos, ver tempo de resposta | TTFB, response size |
| 5 | **Alta** | Sempre | Facil | `CartContext.tsx:61-67` | `totalItems`, `totalRetail`, `totalSmart` recalculados em CADA render (sem useMemo) | Derivacoes caras sem memoizacao no Provider que envolve toda a app | Qualquer interacao que causa re-render | React Profiler, re-render count |
| 6 | **Media** | Sempre | Facil | `Cart.tsx:43,50,67` | Pagina /carrinho nao passa `color` para `removeItem` e `updateQuantity` | Chama `removeItem(item.product.id)` sem o 2o argumento `color` — remove todos os itens daquele produto | Adicionar mesmo produto em 2 cores, tentar remover 1 | Teste manual |
| 7 | **Media** | Sempre | Facil | `Cart.tsx:43` | Imagens nao aparecem na pagina /carrinho (apenas no drawer) | `<div className="w-24 h-24 ... bg-secondary flex-shrink-0" />` — div vazio sem imagem | Abrir /carrinho com itens | Visual |
| 8 | **Media** | Sempre | Media | `HeroBanner.tsx:24` | Hero banner (85-90vh) carrega imagem grande sem otimizacao | `<img src={heroBanner}>` sem `loading="lazy"`, sem srcset, sem formato otimizado | Lighthouse, LCP | LCP (ms) |
| 9 | **Media** | Checkout | Media | `Checkout.tsx:99-121` | CEP lookup dispara a cada mudanca de `form.zip` sem debounce | `useEffect` depende de `form.zip` — se usuario digitar rapido, faz multiplas requests ao ViaCEP | Digitar CEP devagar vs rapido | Network requests count |
| 10 | **Baixa** | Admin | Facil | `Dashboard.tsx:12-14` | Dashboard faz 3 queries pesadas em paralelo sem paginacao (`useAdminProducts`, `useAdminOrders`, customers count) | Com muitos dados, tudo e carregado na memoria | Ter 500+ pedidos/produtos | Tempo de render, memoria |

---

### 2) PLANO DE OTIMIZACAO

**A. Lazy-loading de rotas (impacto imediato no bundle)**
- Converter todas as rotas em `App.tsx` para `React.lazy()` + `Suspense`
- Rotas admin e storefront em chunks separados
- Meta: reduzir bundle inicial em ~40-60%

**B. Memoizacao no CartContext**
- Envolver `totalItems`, `totalRetail`, `totalSmart`, `totalSavings` em `useMemo` com dependencia `[items]`
- Evitar recalculos em cada render da app inteira

**C. Eliminar fetch desnecessario de todos os produtos**
- `ProductDetail.tsx`: criar query dedicada `useRelatedProducts(productId, limit)` no Supabase em vez de carregar tudo
- `Cart.tsx`: mesma abordagem para upsell — query com `.not('id', 'in', cartIds).limit(4)`

**D. Otimizar queries Supabase (N+1)**
- Usar nested selects: `supabase.from('products').select('*, product_variants(*), price_rules(*)')` em vez de 4 queries separadas

**E. Corrigir Cart.tsx (bugs de cor e imagem)**
- Passar `item.selectedColor` para `removeItem` e `updateQuantity`
- Renderizar `item.product.images[0]` em vez de div vazio

**F. Debounce no CEP lookup**
- Adicionar debounce de 500ms no `useEffect` do CEP em `Checkout.tsx`

**G. Hero banner**
- Adicionar `fetchpriority="high"` e `decoding="async"` no hero
- Considerar formato WebP/AVIF se possivel

---

### 3) CACA-BUGS SISTEMATICO

**Erros silenciosos encontrados:**
- `Checkout.tsx:193`: `catch { /* ignore polling errors */ }` — erros de rede no polling sao completamente ignorados
- `ProductForm.tsx:100`: `(async () => { ... })()` dentro de useEffect sem `.catch()` — se a query falhar, erro nao tratado
- `ThemeProvider.tsx:74`: `isPreviewMode` calculado no render body — ok mas fragil

**Bugs confirmados:**
1. **Cart.tsx linhas 50, 67**: `removeItem` e `updateQuantity` sem `color` — bug ja identificado anteriormente no CartDrawer mas NAO corrigido na pagina Cart.tsx
2. **Cart.tsx linha 43**: imagem ausente (mesmo problema do CartDrawer que ja foi corrigido la, mas nao aqui)
3. **CartDrawer.tsx linha 79**: key do item usa `item.product.id` mas deveria usar `item.product.id + item.selectedColor` para evitar conflito de keys quando mesmo produto tem cores diferentes

**Smoke tests minimos necessarios:**
1. Home carrega sem erros
2. Clicar em produto abre detalhe
3. Adicionar produto ao carrinho (com cor)
4. Adicionar mesmo produto com cor diferente
5. Remover 1 cor sem afetar a outra (BUG atual em Cart.tsx)
6. Ir ao checkout, preencher dados, submeter
7. Admin login funciona
8. Admin criar/editar/publicar/despublicar produto
9. Admin filtrar por colecao
10. Admin ativar/desativar em massa

---

### 4) CORRECOES RAPIDAS (ALTA PRIORIDADE)

**Mudancas a implementar:**

1. **Lazy-load de rotas** (`App.tsx`)
   - Todas as 15 rotas convertidas para `React.lazy`
   - Suspense com fallback de loading

2. **Memoizar derivacoes do CartContext** (`CartContext.tsx`)
   - `useMemo` para totalItems, totalRetail, totalSmart, totalSavings

3. **Corrigir Cart.tsx**
   - Passar `item.selectedColor` para removeItem e updateQuantity
   - Renderizar imagem do produto
   - Usar key composta `product.id + selectedColor`

4. **Corrigir CartDrawer.tsx key**
   - Key composta para evitar conflito React

5. **Debounce no CEP** (`Checkout.tsx`)
   - setTimeout de 500ms antes de chamar ViaCEP

6. **Error boundary no ProductForm load**
   - Adicionar `.catch()` na IIFE do useEffect

---

### 5) ENTREGAVEIS

**Checklist pronto pra producao:**
- [ ] Bundle splitado com lazy routes
- [ ] Cart derivations memoizadas
- [ ] Cart.tsx com imagens e cor no remove/update
- [ ] CartDrawer com key composta
- [ ] CEP com debounce
- [ ] Error handling no ProductForm load
- [ ] Query otimizada para produtos relacionados (proximo passo)
- [ ] Queries N+1 resolvidas com nested selects (proximo passo)

**Plano 30/60/90 dias:**

**30 dias (estabilidade):**
- Aplicar todas as 6 correcoes rapidas acima
- Adicionar error boundaries nos componentes principais
- Implementar teste E2E basico do fluxo compra

**60 dias (performance):**
- Migrar queries para nested selects (eliminar N+1)
- Criar `useRelatedProducts` dedicado
- Implementar paginacao no admin (produtos, pedidos)
- Otimizar imagens (WebP, srcset, sizes)

**90 dias (escala):**
- Implementar service worker para cache de assets
- Adicionar indices no Supabase para queries frequentes
- Monitoramento real (Web Vitals reporting)
- Testes automatizados cobrindo smoke tests

---

**Resumo das mudancas imediatas (6 arquivos):**
1. `App.tsx` — lazy routes
2. `CartContext.tsx` — useMemo nas derivacoes
3. `Cart.tsx` — imagem + cor no remove/update + key composta
4. `CartDrawer.tsx` — key composta
5. `Checkout.tsx` — debounce CEP
6. `ProductForm.tsx` — catch no useEffect async

