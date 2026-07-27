## Objetivo

Mostrar imagens no admin em dois pontos, e permitir trocar as imagens das variantes por lá.

1. **Lista de produtos** (`/admin/produtos`): thumbnail pequeno ao lado do nome do produto na coluna já existente (que hoje aparece vazia no seu print).
2. **Editor de produto → Variantes**: cada variante mostra suas imagens (miniaturas) e permite upload/remoção/reordenação — como o card de Mídia principal, só que dentro de cada variante.

## O que muda

### 1. Thumbnail na lista de produtos
- Em `src/pages/admin/Products.tsx`, na coluna já reservada entre "PRODUTO" e "SKU", renderizar `<img src={row.thumbnail}>` 48×48px, `rounded-md`, `object-cover`, com fallback (ícone `ImageIcon`) quando o produto não tem imagem.
- O RPC `admin_products_list` já devolve `thumbnail` (primeira imagem do produto) — nenhum ajuste de backend.
- Adicionar `loading="lazy"` para não pesar em catálogos grandes.

### 2. Imagens por variante (visualizar + editar)
- Em `src/components/admin/product-editor/VariantsCard.tsx`:
  - **Header do accordion (fechado)**: mostrar um mini strip com até 3 thumbnails (16×16) + contador "+N" quando a variante tem mais. Se não tiver imagem, mostrar um placeholder discreto.
  - **Accordion aberto**: nova seção "Imagens da variante" abaixo dos campos existentes, com:
    - Grid de miniaturas (mesma UX do `MediaCard`: drag-to-reorder, botão remover com confirmação, badge "Principal" na primeira).
    - Botão/área "Adicionar imagens" que faz upload múltiplo para `product-images/{productId||temp}/variants/{variantId||idx}/…` via `supabase.storage`.
    - Colar URL externa (input opcional "Adicionar por URL") — útil pra reusar links já existentes.
- Extrair a lógica de upload/reorder/remoção em um subcomponente enxuto `VariantImageManager` (dentro do próprio arquivo `VariantsCard.tsx` ou em `variant-editor/VariantImages.tsx`) para não duplicar código com o `MediaCard`.
- O array `images` já existe no tipo `VariantRow` e no schema `product_variants.images` — o save do produto já persiste. Sem migração.

### Detalhes técnicos
- Upload usa o mesmo bucket público `product-images` já em uso pelo `MediaCard`.
- Caminho: `${productId || 'temp/'+Date.now()}/variants/${variantIdx}/${timestamp}_${rand}.${ext}` — evita colidir com as imagens principais do produto.
- Reordenação por drag-and-drop nativo (mesmo padrão do `MediaCard`).
- Tudo em PT-BR, seguindo tokens semânticos do design system (nada de `text-white`/`bg-black` fixos).

## O que não muda

- Nenhuma alteração no storefront, no schema do banco, nas edge functions ou nas coleções.
- Nenhuma mudança no fluxo de save do produto (o `ProductForm` já envia `variants[].images`).
- Preços, estoque, badge — intocados.

## Validação

- Build completo do projeto.
- Abrir `/admin/produtos`: confirmar thumbnails na coluna.
- Abrir um produto com variantes (ex.: BT Multicover): confirmar strip fechado, expandir uma variante, subir imagem nova, salvar, recarregar e confirmar que persistiu.
