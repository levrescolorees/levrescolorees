
# Fix: Preview do Tema Nao Carrega no Iframe

## Problema

O iframe do preview carrega a URL `/?theme_preview=1` mas descarta o parametro `__lovable_token` da URL pai. Sem esse token, o ambiente de preview do Lovable nao serve o conteudo, resultando no iframe cinza/vazio.

## Solucao

Atualizar a construcao da URL do iframe para preservar parametros essenciais da URL pai (como `__lovable_token`), garantindo que o iframe consiga carregar a pagina normalmente.

## Implementacao

### Arquivo: `src/components/admin/ThemePreviewFrame.tsx`

1. Modificar o `useMemo` de `previewUrl` para copiar query params relevantes da URL pai:
   - Ler `window.location.search` e copiar todos os parametros existentes (exceto os de rota do admin)
   - Adicionar `theme_preview=1`
   - Resultado: `/?theme_preview=1&__lovable_token=...`

2. Quando `previewPage` mudar (navegacao interna), reconstruir a URL do iframe mantendo os mesmos parametros base

### Mudanca de codigo (pseudocodigo)

```typescript
const previewUrl = useMemo(() => {
  const base = window.location.origin;
  const parentParams = new URLSearchParams(window.location.search);
  const params = new URLSearchParams();
  // Preserve env tokens
  parentParams.forEach((value, key) => {
    if (key !== 'theme_preview') params.set(key, value);
  });
  params.set('theme_preview', '1');
  return `${base}/?${params.toString()}`;
}, []);
```

Essa mudanca e minima (apenas o bloco `useMemo` do `previewUrl`) e resolve o problema tanto no ambiente Lovable quanto em producao.
