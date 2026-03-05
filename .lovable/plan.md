

## Diagnóstico e Correção: Erro ao Navegar no Admin

### Problema

A Isabela vê a tela "Algo deu errado" ao navegar entre menus do admin. O ErrorBoundary está capturando o erro, porém **não exibe qual erro é**, impossibilitando o diagnóstico remoto.

### Causa Provável

O ErrorBoundary atual é um **class component** que captura erros no `render`. Porém, quando o React Router troca de rota, **o ErrorBoundary não reseta seu estado** — uma vez que captura um erro, ele permanece na tela de erro para TODAS as rotas seguintes. Isso explica "toda vez que ela tenta mudar de menu".

Além disso, sem ver a mensagem do erro, não sabemos se é um problema de dados (RLS/query), componente corrompido, ou outra coisa.

### Plano

**1. Adicionar reset automático por rota no ErrorBoundary**
- Receber a `location.pathname` como `key` prop para que o React recrie o boundary a cada troca de rota
- Isso permite que ao navegar para outra página, o erro anterior seja descartado

**2. Mostrar detalhes do erro no fallback**
- Adicionar seção colapsável "Detalhes técnicos" com `error.message` e stack trace
- Isso permite diagnóstico remoto sem precisar abrir DevTools
- Mostrar a versão do app (`APP_VERSION`) no fallback

**3. Envolver o `<Outlet>` do AdminLayout com ErrorBoundary por rota**
- Adicionar um ErrorBoundary **dentro** do AdminLayout que envolve apenas o `<Outlet>`
- Usar `useLocation().pathname` como key para resetar a cada navegação
- Assim, se uma página admin crashar, o sidebar continua visível e funcional

### Arquivos Alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/ErrorBoundary.tsx` | Adicionar detalhes do erro e versão no fallback |
| `src/pages/admin/AdminLayout.tsx` | Envolver `<Outlet>` com ErrorBoundary keyed por rota |

