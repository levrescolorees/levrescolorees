## Objetivo

Adicionar ao catálogo estes **4 produtos Boca Rosa** via API pública VTEX da Época Cosméticos (o bloqueio anti-bot afeta as páginas HTML, mas o endpoint JSON responde normal):

| # | Produto | Variantes |
|---|---|---|
| 1 | **Base Mate Boca Rosa Beauty by Payot** | 8 (01 Maria, 02 Ana, 03 Francisca, 04 Antonia, 05 Adriana, 06 Juliana, 07 Marcia, 09 Aline) |
| 2 | **Corretivo Líquido Payot Boca Rosa Beauty** | 3 (Orquídea, Iris, Petunia) |
| 3 | **Máscara para Cílios #MeuVolumão Boca Rosa – Preto 6g** | sem variantes |
| 4 | **Pó Solto Facial Payot Boca Rosa Beauty** | 3 (1/2/3 Mármore) |

Situação: **19 produtos hoje → 23 depois desta importação**.

## Como

Nova edge function `supabase/functions/import-epoca-product/index.ts` seguindo o mesmo padrão da `import-bt-product` já existente:

- Recebe `?slug=xxx` na query
- Faz `fetch` em `https://www.epocacosmeticos.com.br/api/catalog_system/pub/products/search/{slug}/p` com `User-Agent: Mozilla/5.0`
- Baixa imagens principais + de cada variante (usadas também como swatch no seletor de cores)
- Upload no bucket `product-images/boca-rosa/{slug}/...`
- Upsert em `products` (SKU baseado no slug) e `product_variants` (nome do tom vem de `item.name`)
- Registra `verify_jwt = false` em `supabase/config.toml`

## Coleções

- Cria/vincula à nova coleção **"Boca Rosa"** (marca)
- Vincula também em **Novidades**

## Configuração padrão aplicada aos 4

- Preço varejo/custo: **R$ 13,99** (ajustável no admin depois)
- Estoque: **100 por variante**
- Peso: **0,05 kg** (ajustável)
- Badge: **Novo**
- Status: publicado e ativo

## Execução

1. Deploy automático da função ao commitar.
2. Disparo de 4 chamadas (uma por slug) via `supabase--curl_edge_functions`.
3. Validação abrindo `/produto/{slug}` na loja e conferindo variantes no admin.

## O que NÃO faço

- Não altero nenhum dos 19 produtos existentes.
- Não sigo com os produtos do PDF anterior neste plano (fica separado).