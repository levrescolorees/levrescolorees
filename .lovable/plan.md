

## Galeria de imagens clicavel na pagina de produto

### Problema
A galeria de imagens na pagina de produto (`ProductDetail.tsx`) e no preview do admin (`ProductPreviewDrawer.tsx`) nao tem estado para controlar a imagem principal. As thumbnails tem `cursor-pointer` mas nenhum `onClick` — clicar nelas nao faz nada.

A imagem principal esta hardcoded como `product.images?.[0]`.

### Correcao

**Arquivo: `src/pages/ProductDetail.tsx`**

1. Adicionar estado `selectedImage` (indice, default 0)
2. Imagem principal usa `product.images?.[selectedImage]` em vez de `[0]`
3. Thumbnails mostram todas as imagens disponiveis (nao indices fixos 1-4), incluindo a primeira
4. Cada thumbnail recebe `onClick={() => setSelectedImage(i)}`
5. Thumbnail ativa recebe `border-primary` em vez de `border-transparent`

**Arquivo: `src/components/admin/product-editor/ProductPreviewDrawer.tsx`**

Mesma logica:
1. Adicionar estado `selectedImage` (indice, default 0)
2. Imagem principal usa `images[selectedImage]`
3. Thumbnails mostram todas as imagens com click handler
4. Thumbnail ativa destacada com borda

### Detalhes da galeria melhorada

- Thumbnails mostram ate 5 imagens (indices 0-4), todas clicaveis
- A imagem principal e a primeira por padrao, muda ao clicar numa thumbnail
- A thumbnail da imagem atualmente selecionada tem borda `border-primary`

