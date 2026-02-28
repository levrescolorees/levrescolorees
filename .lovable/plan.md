

## Otimizacao de Performance do Admin

### Problema
Todas as queries admin refazem fetch a cada montagem/foco de aba porque nao tem `staleTime`. O Dashboard carrega dados completos (produtos com variants, price_rules, collections) apenas para contar e mostrar KPIs.

### Mudancas

**1. `src/App.tsx` — QueryClient defaults**
- Adicionar `defaultOptions.queries.staleTime: 30_000` (30s) e `refetchOnWindowFocus: false` no QueryClient

**2. `src/hooks/useProducts.ts` — staleTime nas queries admin**
- `useAdminProducts`: adicionar `staleTime: 60_000`
- `useStorefrontProducts`: adicionar `staleTime: 60_000`
- `useCollections`: adicionar `staleTime: 60_000`

**3. `src/hooks/useOrders.ts` — staleTime**
- `useAdminOrders`: adicionar `staleTime: 30_000`
- `useAdminCustomers`: adicionar `staleTime: 60_000`

**4. `src/pages/admin/Dashboard.tsx` — queries leves**
- Substituir `useAdminProducts()` por query leve: `select('id, name, stock, is_active')` sem joins em variants/priceRules/collections
- Substituir `useAdminOrders()` por query leve: `select('id, status, total, created_at')` sem join em customers
- Adicionar `staleTime: 30_000` nas queries do dashboard

**5. `src/hooks/useAdminUsers.ts` — staleTime**
- Adicionar `staleTime: 60_000`

