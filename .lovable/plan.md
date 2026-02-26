

## Produtos sem foto mostram imagem generica (lipgloss)

### Problema

Quando um produto nao tem imagens, o codigo usa `collectionImg` (foto de lip gloss) como fallback em todos os lugares:

- `ProductCard.tsx` linha 55: `product.images?.[0] || collectionImg`
- `ProductDetail.tsx` linha 90: `product.images?.[selectedImage] || collectionImg`

Isso faz parecer que o produto tem foto quando na verdade nao tem.

### Correcao

Substituir o fallback `collectionImg` por um placeholder neutro em todos os componentes afetados:

**1. `src/components/ProductCard.tsx`**
- Remover import de `collectionImg`
- Quando `product.images` esta vazio ou nulo, mostrar um div com icone de imagem (ImageIcon do lucide) e fundo `bg-secondary` em vez de uma foto falsa

**2. `src/pages/ProductDetail.tsx`**
- Remover import de `collectionImg`
- Imagem principal: se nao ha imagens, mostrar placeholder com icone
- Nao mostrar grid de thumbnails se nao ha imagens

**3. `src/components/admin/product-editor/ProductPreviewDrawer.tsx`**
- Ja tem tratamento correto (mostra icone quando nao ha imagem) — nenhuma mudanca necessaria

### Resultado visual

Produtos sem foto mostrarao um fundo cinza claro com um icone de imagem centralizado, deixando claro que o produto ainda nao tem fotos cadastradas.

