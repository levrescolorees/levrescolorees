## Objetivo

Importar do site oficial (linhabrunatavares.com — VTEX) o produto **BT Skin – Base Líquida** com **todas as 30 variações de tom**, incluindo:
- Nome do tom (ex.: F10, L20, M30, T40, D50…)
- Subtom / família (Fair, Light, Medium, Tan, Deep)
- Imagem do bocal (aquele círculo colorido do swatch) para cada tom
- Imagens principais do produto (packshot, embalagem, textura)
- Descrição oficial

Cadastrar no `/admin/produtos` **e** deixar visível na loja pública.

## Parâmetros

- Custo R$ 1,00 / Venda R$ 1,00 (você ajusta depois — foi o que você pediu)
- Estoque 100 por variação
- `is_active: true`, `status: 'published'`, `published_at: now()` — para aparecer na loja
- Anexar à coleção **"Mais Vendidos"** (usada pela home) e à **"Novidades"**; se não existirem, cria.

## Fonte dos dados (sem connector, sem scraper pago)

A VTEX expõe endpoints públicos JSON:

- `GET /api/catalog_system/pub/products/search/bt-skin` → produto pai + todos os `items` (SKUs) com nome, imagens em alta e specifications.
- Cada SKU tem `images[]` com o bocal/swatch (`001-<TOM>.png`) já pronto em `brunatavares.vtexassets.com`.
- A família (Fair/Light/Medium/Tan/Deep) sai do prefixo do nome do tom: **F**→Fair, **L**→Light, **M**→Medium, **T**→Tan, **D**→Deep.

Já validei que o endpoint responde e traz todos os tons numa única chamada.

## Passos

1. **Edge function `import-bt-skin`** (nova, `verify_jwt = false` no `config.toml`)
   - Fetch da API VTEX do slug `bt-skin`.
   - Valida resposta com Zod.
   - Baixa 4–6 imagens principais do produto pai + 1 imagem de swatch por tom, faz upload no bucket `product-images` em `bt-skin/<slug>.jpg` (com `upsert: true`) → coleta URLs públicas Supabase.
   - Monta e insere via `service_role`:
     - `products` (1 linha):
       - name: "BT Skin – Base Líquida Aveludada 40ml"
       - slug: `bt-skin-base-liquida-40ml-<rand>`
       - sku: `BTSKIN-40ML`
       - retail_price: 1, cost_price: 1, stock: 0, weight: 0.08 (kg)
       - short_description / description: extraídos da VTEX (HTML limpo com sanitização)
       - images: URLs públicas do bucket
       - is_active: true, status: 'published', published_at: now()
       - badge: "Novo"
     - `product_variants` (30 linhas — uma por tom):
       - name: `"<Família> <Tom>"` (ex.: "Medium M30") — para o swatch/rótulo já sair legível
       - sku: `BTSKIN-40ML-<TOM>`
       - stock: 100, price_override: null, sort_order: índice
       - images: `[<url pública do swatch do tom>]`
     - `collection_products`: anexa à(s) coleção(ões) padrão (cria se faltar).
   - Retorna `{ product_id, slug, variants_count, admin_url, storefront_url }`.

2. **Deploy + disparo** via `supabase--curl_edge_functions` (POST vazio).

3. **Verificação**
   - `SELECT` do produto + `COUNT` de variantes (esperado 30).
   - Abro a rota `/produto/<slug>` no preview para conferir imagens/tons visíveis na loja.
   - Confirmo que aparece no `/admin/produtos`.

## Detalhes técnicos

- Sem novos secrets — usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existentes.
- Bucket `product-images` já é público → URLs de swatch funcionam direto no front.
- `stock` do produto pai fica 0 (o real está nas variantes) — comportamento igual ao cadastro manual.
- Idempotência: função checa se já existe produto com `sku='BTSKIN-40ML'`; se sim, atualiza (upsert de imagens + variantes por SKU) em vez de duplicar.
- Slug com sufixo aleatório só na criação — no re-run mantém o slug existente.
- Reaproveitável: aceita `?slug=bt-skin` (ou qualquer outro slug BT) via query, então serve para trazer futuros produtos da linha depois.
- Sem mudanças no frontend — a loja já lê `products`/`product_variants` e o `ProductCard` já mostra swatches a partir de `variants[].images[0]`.

Ao aprovar, sigo direto: crio a função, disparo, verifico no banco e no preview, e te mando os links.
