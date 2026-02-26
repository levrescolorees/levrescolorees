

## Corrigir race condition nos botoes Publicar/Despublicar

### Problema identificado

Os botoes **Publicar** e **Despublicar** tem um bug critico de race condition. Ambos fazem:

```
setForm(prev => ({ ...prev, status: 'published' }));
setTimeout(() => saveProduct(false), 50);
```

O `saveProduct` e um `useCallback` que captura o estado `form` no momento da criacao. O `setTimeout` de 50ms captura a referencia ANTIGA do `saveProduct`, que ainda tem o `form` com o status anterior. Resultado: o produto nao muda de status no banco.

### Plano de correcao

**Arquivo: `src/pages/admin/ProductForm.tsx`**

1. Refatorar `saveProduct` para aceitar um parametro opcional `overrides` que sobrepoe campos do form antes de salvar
2. Remover os `setTimeout` de `handlePublish` e `handleUnpublish`
3. Chamar `saveProduct` diretamente passando os overrides de status

```typescript
// saveProduct aceita overrides
const saveProduct = useCallback(async (redirect = false, overrides?: Partial<FormData>) => {
  const merged = overrides ? { ...form, ...overrides } : form;
  // usar merged em vez de form para buildProductData
  ...
});

// handlePublish sem setTimeout
const handlePublish = () => {
  if (!validate(true)) { ... return; }
  const overrides = { status: 'published', published_at: new Date().toISOString(), is_active: true };
  setForm(prev => ({ ...prev, ...overrides }));
  saveProduct(false, overrides);
};

// handleUnpublish sem setTimeout
const handleUnpublish = () => {
  const overrides = { status: 'draft', is_active: false };
  setForm(prev => ({ ...prev, ...overrides }));
  saveProduct(false, overrides);
};
```

4. Verificar que `buildProductData` usa os dados merged em vez de ler diretamente do state `form`

### Botoes verificados

| Botao | Status | Acao |
|---|---|---|
| Voltar (seta) | OK | Link simples para /admin/produtos |
| Preview | OK | Abre drawer com dados atuais do form |
| Duplicar | OK | Funcao independente, nao depende de setTimeout |
| Publicar | BUG | Race condition com setTimeout - sera corrigido |
| Despublicar | BUG | Race condition com setTimeout - sera corrigido |
| Salvar e continuar | OK | Chama saveProduct(false) diretamente |
| Salvar | OK | Chama saveProduct(true) diretamente |
| Ctrl+S | OK | Chama saveProduct(false) diretamente |

