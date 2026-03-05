

## Diagnóstico: Tela Branca

### Causa Provável

O app **não tem Error Boundary** (React). Se qualquer componente lançar um erro durante a renderização — seja por falha de rede, dados inesperados de uma query Supabase, ou qualquer exceção JavaScript — o React desmonta a árvore inteira e exibe uma tela branca sem nenhum feedback.

Sem Error Boundary, não há log no console nem replay de sessão (o app morre antes de montar).

### Plano de Correção

**1. Criar um Error Boundary global** (`src/components/ErrorBoundary.tsx`)
- Class component React com `componentDidCatch` e `getDerivedStateFromError`
- Exibe uma tela amigável com botão "Recarregar página" em vez de tela branca
- Loga o erro no console para diagnóstico

**2. Envolver o App com o Error Boundary** (`src/App.tsx`)
- Wraps everything inside `<ErrorBoundary>` logo após os providers
- Se qualquer filho crashar, o fallback aparece em vez da tela branca

**3. Adicionar tratamento de erro no ThemeProvider**
- O `useStoreSettings` pode falhar silenciosamente, mas o `migrateTheme(raw)` pode lançar exceção se `raw` tiver formato inesperado
- Adicionar try/catch no `migrateTheme` para fallback ao tema padrão

**4. Adicionar tratamento de erro no AuthProvider**
- A query `fetchRole` pode falhar por rede ou RLS — garantir que `setLoading(false)` é chamado mesmo em caso de erro, evitando loading infinito (tela branca)

### Arquivos Alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/ErrorBoundary.tsx` | Novo — Error Boundary com fallback visual |
| `src/App.tsx` | Envolver conteúdo com `<ErrorBoundary>` |
| `src/components/ThemeProvider.tsx` | try/catch no migrateTheme |
| `src/hooks/useAuth.tsx` | try/catch no fetchRole com fallback |

