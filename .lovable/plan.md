

## Analise completa do codigo - Bugs encontrados

### BUG 1 (CRITICO) - Filtro de colecao no admin com precedencia de operador errada
**Arquivo:** `src/pages/admin/Products.tsx` linhas 191-199

```javascript
const matchesCollection = filterCollectionId === 'all' ||
  filterCollectionId === 'none'
    ? !(p as any).collections?.length
    : ((p as any).collections as any[])?.some(...);
```

O operador ternario `?` tem precedencia menor que `||`, entao a expressao e avaliada como:
```
(filterCollectionId === 'all' || filterCollectionId === 'none') ? ... : ...
```
Isso faz com que quando `filterCollectionId === 'all'`, o resultado seja `!(p).collections?.length` (mostra apenas produtos SEM colecao), em vez de mostrar todos.

**Correcao:** adicionar parenteses explicitos.

---

### BUG 2 (CRITICO) - Autosave cria loop infinito de saves
**Arquivo:** `src/hooks/useAutosave.ts` linhas 43-55 e `src/pages/admin/ProductForm.tsx` linha 206

O `onSave` no autosave chama `saveProduct(false)`, que por sua vez chama `autosave.markSaved()` (linha 188 do ProductForm). O `markSaved` atualiza `lastSavedRef` mas o `onSave` dentro do `setTimeout` tambem atualiza `lastSavedRef` na linha 49. Alem disso, `onSave` nao e estavel (e recriado a cada render porque `saveProduct` muda), causando re-execucao do useEffect do autosave desnecessariamente.

**Correcao:** Usar `useRef` para `onSave` no autosave para evitar que mudancas no callback disparem o efeito.

---

### BUG 3 (MODERADO) - `validate()` usa estado stale quando chamado com overrides
**Arquivo:** `src/pages/admin/ProductForm.tsx` linha 137

Quando `handlePublish` chama `saveProduct(false, overrides)`, o `saveProduct` chama `validate()` que le `form` do estado. Mas `validate` nao recebe os overrides, entao se o status do form era 'draft' e o override e 'published', o validate ainda valida contra o form antigo. Nao causa erro atualmente, mas `validate(true)` ja e chamado antes no `handlePublish`, entao ha uma validacao redundante dentro de `saveProduct`.

---

### BUG 4 (MODERADO) - Cart usa tipos legados incompativeis com dados do DB
**Arquivo:** `src/context/CartContext.tsx`, `src/components/CartDrawer.tsx`, `src/pages/ProductDetail.tsx`

O carrinho usa a interface `Product` de `src/data/products.ts` com campos `retailPrice`, `box06Price`, `box12Price`. Tanto `ProductCard.tsx` quanto `ProductDetail.tsx` criam um objeto "legacyProduct" para adaptar os dados do DB ao formato antigo. Isso funciona, mas:
- Se um produto nao tem price rules, `box06Price` e `box12Price` serao iguais ao `retail_price`, e o CartDrawer mostrara "Preco Box 12 desbloqueado!" sem desconto real
- O `removeItem` no carrinho filtra por `product.id` mas nao por `selectedColor`, entao remover um item remove TODOS os itens daquele produto (mesmo com cores diferentes)

---

### BUG 5 (MENOR) - Imagens nao aparecem no CartDrawer
**Arquivo:** `src/components/CartDrawer.tsx` linha 87

```jsx
<div className="w-full h-full bg-secondary" />
```

O CartDrawer nunca renderiza a imagem do produto. E apenas um `div` cinza. Deveria usar `item.product.images[0]`.

---

### BUG 6 (MENOR) - `X` import nao usado em Collections.tsx
**Arquivo:** `src/pages/Collections.tsx` linha 4

`X` e importado de lucide-react mas nunca usado no JSX.

---

### Plano de correcao

**1. `src/pages/admin/Products.tsx`** - Corrigir precedencia do operador no filtro de colecao com parenteses

**2. `src/hooks/useAutosave.ts`** - Usar `useRef` para `onSave` para estabilizar a referencia e evitar re-triggers

**3. `src/components/CartDrawer.tsx`** - Renderizar imagem do produto em vez de div vazio

**4. `src/context/CartContext.tsx`** - Corrigir `removeItem` e `updateQuantity` para considerar `selectedColor` (produto + cor = item unico)

**5. `src/pages/Collections.tsx`** - Remover import nao usado do `X`

