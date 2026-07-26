## Objetivo
Consolidar produtos "unitários" do catálogo que na verdade são tons/versões do mesmo produto, transformando cada grupo em **um único produto com variantes** (igual ao BT Skin).

## Grupos detectados (16 grupos → 62 produtos viram 16)

| Produto base | Variantes | Sufixos |
|---|---|---|
| Mari Maria Corretivo Cover Up | 12 | MM01…MM13 |
| Mari Maria Pó Solto Soft Silk | 7 | Cotton Candy, Cupcake, Golden Set, Quick Bake, Sugar Coat, Sweet Banana, Vanilla Puff |
| Ruby Rose Silk Skin Batom Líquido Confort Lips | 6 | SL07…SL12 |
| Mari Maria Pó Compacto Soft Silk | 5 | Banana Smoth, Elegance, Luminous Dust, Radiant, Sun Bean |
| Ruby Rose Blow Pó Compacto Oh My Blur | 4 | PBW10…PBW40 |
| Mari Maria Iluminador Divine Glow | 4 | Aurora, Bronze, Glister, Splendid |
| Ruby Rose Soft Beauty Silk Skin Corretivo Líquido | 3 | CL10, CL20, CL30 |
| Mari Maria Blush Sunny Cheeks | 3 | Dusty, Love, Mystique |
| Mari Maria Multifuncional Tropical Tan | 2 | Glow, Sparkle |
| Mari Maria Velvet Skin Base e Corretivo | 2 | Amêndoa, Caramelo |
| Ruby Rose Blow Base Oh My Skin Tons Claros | 2 | G1, G2 |
| Ruby Rose Blow Bronzer Baked Feels Like Sun | 2 | BFS20, BFS30 |
| Ruby Rose Blow Corretivo Líquido So Real | 2 | HBM604G1, HBM604G12 |

Também detectados mas **suspeitos** (podem ser produtos diferentes, não tons):
- Ruby Rose Duo Batom e Gloss Líquido — G1/G2
- Ruby Rose Batom Duo Kiss Lipstick — G1/G2
- Ruby Rose Trio de Sombras Viver — G1/G2

Vou **incluir** esses também (G1/G2 é padrão Ruby Rose para "cartela 1" e "cartela 2"). Se quiser deixar separados, me avisa antes de aprovar.

Não incluídos (produtos únicos ou linhas diferentes): Blush Sunny Cheeks já é 3 tons ok; produtos "Nectar Espresso/Rouge/Luxe/Deep/Ruby Pulse (L6504)" (sufixo entre parênteses) — se quiser consolidar esses 5 num só ("Ruby Rose Silk Skin Lip Oil Nectar"), me confirma.

## Como será a consolidação (por grupo)

1. **Escolher o "produto mestre"**: o de menor SKU no grupo (ex.: `MM-COVERUP-01`).
2. **Renomear** o mestre para o nome base (ex.: "Mari Maria Corretivo Cover Up").
3. **Criar variantes** em `product_variants` a partir de cada produto do grupo:
   - `name` = sufixo (ex.: "MM01", "Aurora", "SL09")
   - `sku` = SKU original
   - `stock` = estoque atual do produto
   - `price_override` = preço atual do produto (só se diferir do mestre)
   - `images` = imagens do produto original (viram swatches)
4. **Mesclar imagens** do produto: unir arrays `images` de todos os itens do grupo no mestre (deduplicado, limite razoável).
5. **Migrar coleções**: qualquer `collection_products` dos produtos "filhos" que não exista no mestre é copiado para o mestre.
6. **Deletar** os produtos filhos (o mestre permanece com todas as variantes).

Tudo em **uma única migration transacional** para poder reverter caso dê erro.

## Preservação
- Pedidos existentes (`order_items`) já guardam `product_snapshot` — não quebram.
- FKs de `collection_products` são deletadas em cascata ao remover os filhos (após copiar).
- Se algum produto filho estiver referenciado em `order_items.product_id` com FK restrita, usa `ON DELETE SET NULL` (já é padrão do schema conforme memória) e o snapshot preserva os dados.

## Verificação pós-migração
Depois da execução vou rodar `SELECT` de conferência mostrando:
- Total de produtos antes/depois
- Cada mestre com sua contagem de variantes
- Amostra visual de 2-3 grupos com as variantes criadas

Nenhum código do app precisa mudar — a UI de produto já suporta variantes (`ColorSwatchPicker` cai no fallback de pills para grupos sem swatch de cor).
