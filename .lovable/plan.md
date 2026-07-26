
## Objetivo
Trocar o seletor de cor atual (pills de texto) da página de produto por um seletor de **círculos redondos com o tom da pele**, com filtro por família (Fair, Light, Medium, Tan, Deep + Todas as cores), igual ao print da linhabrunatavares.com.

## O que já existe (não precisa mudar)
- 30 variações cadastradas com nome no formato `Fair F10`, `Light L20`, `Medium M30`, `Tan T40`, `Deep D50` etc.
- Cada variação tem uma imagem-swatch (`tom-f10.png`…) — vamos usá-la como fundo do círculo, exatamente como o site oficial faz.

## Escopo da mudança (arquivo único)
`src/pages/ProductDetail.tsx` — apenas o bloco "Cor: …" (linhas ~175-190). Nenhuma alteração de schema, checkout, carrinho ou admin.

### Novo componente inline: `ColorSwatchPicker`
1. **Detectar família** a partir do nome da variação: primeira palavra (`Fair`/`Light`/`Medium`/`Tan`/`Deep`). Se o produto não seguir esse padrão (produto sem famílias), cai no seletor de pills antigo automaticamente.
2. **Barra de filtros** no topo, na ordem fixa: `Fair · Light · Medium · Tan · Deep · [Todas as cores]`. Cada filtro mostra um mini-círculo com uma cor representativa da família + label. Selecionado = borda `primary`. Padrão inicial: "Todas as cores".
3. **Label** "Cor Selecionada: **<código>**" (ex: `M10`) — extrai o código depois do espaço.
4. **Grid de swatches**: círculos de ~44px, `grid-cols-9` no desktop e `grid-cols-6` no mobile. Cada círculo usa a `image` da variação como `background-image` (mesmo visual do site da BT). Selecionado ganha anel `ring-2 ring-primary ring-offset-2`. Sem estoque = risco diagonal + `opacity-60`. Hover = leve `scale-110`.
5. Ao clicar, chama o mesmo `setSelectedColor(v.name)` já existente — resto do fluxo (adicionar ao carrinho, preço, etc.) não muda.

### Ajuste no `ProductCard` (opcional, mesmo arquivo do product detail)
Não mexer agora. Só a página de detalhe.

## Fora de escopo
- Não alterar tabela `product_variants` nem adicionar coluna de cor hex — a imagem-swatch já é a fonte da cor.
- Não mudar checkout, carrinho, ou lógica de estoque.
- Não mexer no admin.

## Como validar
Abrir `/produto/bt-skin-base-liquida-40ml-hdrs97` no preview e conferir:
- Filtros de família funcionando (clicar em "Medium" mostra só M10–M60).
- Clicar num círculo troca o "Cor Selecionada" e mantém o "Comprar" funcionando.
- Em produtos sem famílias no nome, seletor antigo aparece.
