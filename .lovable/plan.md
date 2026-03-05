

## Correção: Loop infinito de autosave

### Problema identificado

O hook `useAutosave` tem `data` (um objeto novo a cada render) na lista de dependências do `useEffect` (linha 65). Isso faz o efeito re-executar a **cada render**, mesmo sem mudança real nos dados. Quando o save termina, ele causa re-renders (via `setStatus`, `setSaving`, `toast`, `invalidateQueries`), o que dispara o efeito novamente — criando um loop de salvamento.

Além disso, na linha 54, `JSON.stringify(data)` usa o valor capturado na closure do timeout, que pode estar desatualizado em relação ao estado real.

### Correção

**Arquivo: `src/hooks/useAutosave.ts`**

1. **Remover `data` das dependências do efeito** — usar apenas `currentJson` (que já é `JSON.stringify(data)`)
2. **Usar `currentJson` no timeout** em vez de `JSON.stringify(data)` para evitar closure stale
3. **Adicionar guard `isSavingRef`** para impedir que um novo save dispare enquanto outro está em andamento
4. **Estabilizar `markSaved`** — usar `currentJson` via ref em vez de `data` na dependência do `useCallback`

### Mudanças técnicas

```
// Antes (linha 65):
}, [currentJson, enabled, debounceMs, data]);

// Depois:
}, [currentJson, enabled, debounceMs]);
```

```
// Antes (linha 54):
lastSavedRef.current = JSON.stringify(data);

// Depois:
lastSavedRef.current = currentJson;
// (currentJson capturado via ref para evitar stale closure)
```

Adicionar `isSavingRef` para bloquear re-entradas durante o save.

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAutosave.ts` | Corrigir dependências, guard de re-entrada, closure estável |

