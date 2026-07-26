## Objetivo
Ao selecionar um tom no seletor de cores, mostrar o swatch grande na área da imagem principal — sem adicionar essa imagem à galeria de miniaturas.

## Comportamento
- Ao clicar em uma cor (ex.: M10), a **imagem principal** troca temporariamente para o swatch grande daquele tom.
- As **miniaturas** continuam mostrando apenas as imagens originais do produto (não incluem swatches).
- Se o usuário clicar em uma miniatura, volta a exibir a imagem do produto normalmente (a seleção da cor continua ativa no seletor abaixo).
- Trocar de cor novamente atualiza a imagem grande para o novo swatch.
- Produtos sem swatch por variação seguem com o comportamento atual (sem mudanças).

## Alterações técnicas
- `src/pages/ProductDetail.tsx`:
  - Adicionar estado `variantImageOverride` que guarda a URL do swatch da variação selecionada.
  - Quando `selectedVariant` muda e possui `images[0]`, setar o override e apontar o índice da galeria para "override".
  - Ao clicar numa miniatura real, limpar o override.
  - Passar a imagem exibida para o componente de galeria sem alterar a lista de thumbnails.
- Não altera schema, dados, checkout, nem o `ColorSwatchPicker`.
