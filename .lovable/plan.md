

## Correção: Erro "insertBefore" no DOM

### Diagnóstico

O erro `Failed to execute 'insertBefore' on 'Node'` é um problema **clássico do React** causado por **extensões de navegador** (Google Translate, Grammarly, ad blockers, etc.) que modificam o DOM por fora do React. Quando o React tenta reconciliar o DOM e encontra nós que foram movidos/removidos pela extensão, ele crasheia.

Isso explica por que acontece **só no PC da Isabela** — ela provavelmente tem uma extensão (ex: tradução automática do Chrome) que mexe nos nós de texto da página.

### Solução

Atualizar o `ErrorBoundary` para **ignorar este erro específico** e tentar se recuperar automaticamente em vez de mostrar a tela de erro.

**Arquivo: `src/components/ErrorBoundary.tsx`**

1. No `getDerivedStateFromError`, detectar se o erro contém `"insertBefore"` ou `"removeChild"` (erros comuns de extensões)
2. Se for esse tipo de erro, fazer `setState` para resetar e tentar re-render em vez de mostrar o fallback
3. Adicionar `componentDidCatch` que loga mas não crasheia para esses erros de DOM

Adicionalmente, adicionar uma meta tag no `index.html` para impedir tradução automática:

**Arquivo: `index.html`**

- Adicionar `<meta name="google" content="notranslate">` no `<head>`

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/ErrorBoundary.tsx` | Ignorar erros de DOM causados por extensões, tentar recovery |
| `index.html` | Meta tag para desabilitar tradução automática do Chrome |

