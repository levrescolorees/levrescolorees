## Objetivo

Apagar todos os produtos que **não foram unificados** (os que ficaram com 0 variações), mantendo apenas os 17 produtos-mestre com variações. Depois revisamos um a um e recadastramos o que faltar.

## O que fica (17 produtos com variações)

- BT Skin – Base Líquida Aveludada 40ml (30 tons)
- Mari Maria Corretivo Cover Up (12), Pó Solto Soft Silk (7), Pó Compacto Soft Silk (5), Iluminador Divine Glow (4), Blush Sunny Cheeks (3), Multifuncional Tropical Tan (2), Velvet Skin (2)
- Ruby Rose Silk Skin Confort Lips (6), Blow Bronzer (5), Blow Pó Compacto Oh My Blur (4), Soft Beauty Corretivo (3), Batom Duo Kiss (2), Blow Base Oh My Skin (2), Blow Corretivo So Real (2), Duo Batom e Gloss (2), Trio de Sombras Viver (2)

## O que sai (~75 produtos com 0 variações)

Todos os SKUs sem variações vinculadas — inclui pincéis, esponjas, batons únicos, glosses, máscaras de cílios, etc. Se algum deles for legítimo (produto realmente único, não duplicata), a gente recadastra depois.

## Execução

Uma migração SQL única que, dentro de uma transação:

1. Remove `collection_products` de todos os produtos com 0 variações
2. Remove `price_rules` desses produtos
3. Zera `variant_id` em `order_items` que referenciem variantes desses produtos (nenhuma esperada, mas por segurança) e desassocia `product_id`
4. `DELETE FROM products WHERE id IN (SELECT ... 0 variants)`

Não mexo em imagens do bucket (ficam órfãs mas não atrapalham; se quiser limpar depois eu faço).

## Depois

Te mando a lista final dos 17 produtos que sobraram para revisar com calma no `/admin/produtos` e apontar os que faltam recadastrar.
