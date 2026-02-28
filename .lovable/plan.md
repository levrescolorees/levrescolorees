

## Corrigir Tela Branca na Navegacao

### Problema
O `Suspense` envolve TODAS as rotas com um unico fallback. Quando o usuario navega para qualquer pagina lazy, o React desmonta tudo e mostra o `PageLoader` (tela branca com spinner) ate o chunk carregar.

### Solucao

**1. Admin: mover Suspense para dentro do layout**
- No `AdminLayout.tsx`, envolver o `<Outlet />` com `<Suspense fallback={...}>` usando um loader menor (spinner inline, sem `min-h-screen`)
- Isso mantem a sidebar e header visiveis durante a troca de pagina

**2. Storefront: envolver cada rota individualmente**
- Cada rota storefront recebe seu proprio `<Suspense>` inline
- Alternativa mais simples: remover lazy das paginas admin internas (Dashboard, Products, etc.) ja que sao pequenas e o AdminLayout ja e lazy

**3. App.tsx — reestruturar Suspense**
- Manter o `Suspense` global apenas como safety net
- Adicionar `Suspense` individual nas rotas admin internas dentro do `AdminLayout`
- Para storefront, manter lazy mas com fallback que preserva Header/Footer

### Mudancas concretas

**`src/pages/admin/AdminLayout.tsx`**
- Importar `Suspense`
- Envolver `<Outlet />` com `<Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>`
- Resultado: sidebar + header permanecem, so o conteudo principal mostra spinner

**`src/App.tsx`**
- Remover lazy das paginas admin internas (Dashboard, Products, ProductForm, AdminCollections, AdminOrders, OrderDetail, AdminCustomers, AdminCoupons, AdminSettings, AdminMedia, AdminIntegrations, AdminThemeEditor) — importar direto
- Manter lazy apenas em AdminLayout, AdminLogin e paginas storefront
- Isso elimina o flash branco no admin completamente

