## Objetivo

Cadastrar no catálogo o produto **Bruna Tavares BT Skin – Base Líquida Aveludada 40ml** e todas as variações (tons) listadas na página da Shopee, exatamente como se estivessem sendo criadas pelo painel `/admin`.

Parâmetros já definidos por você:
- Preço de custo: **R$ 1,00** / Preço de venda: **R$ 1,00** (você ajusta depois, tom a tom)
- Estoque inicial: **100** por variação
- Dados serão **extraídos automaticamente** da URL da Shopee

## Desafio de extração

A Shopee bloqueia scraping direto (o fetch retorna página vazia e a API interna retorna erro `90309999`). Precisamos de um scraper que renderize JS e contorne anti-bot. Duas rotas possíveis:

1. **Firecrawl** (recomendado) – connector Lovable, retorna markdown + JSON estruturado da PDP.
2. **Apify** com actor de Shopee – alternativa se Firecrawl não pegar variações.

Nenhum dos dois está conectado hoje no workspace, então o primeiro passo é conectar um.

## Passos

1. **Conectar scraper**
   - Abrir card `standard_connectors--connect` do **Firecrawl** (managed auth, sem BYOK).
   - Se Firecrawl não conseguir retornar a lista de tons, cair para Apify (`connect` de Apify + actor `easyapi/shopee-product-scraper` ou similar).

2. **Extrair dados via edge function temporária** `scrape-shopee-product`
   - Recebe a URL da Shopee.
   - Chama Firecrawl `scrape` com `formats: [{ type: 'json', prompt: 'Extraia nome, descrição, imagens principais e lista de variações (nome do tom + imagem) do produto' }]` + `screenshot` para debug.
   - Retorna JSON: `{ name, description, images[], variants: [{ name, image }] }`.
   - Sem persistência ainda — só devolve o resultado para eu revisar.

3. **Revisar extração**
   - Eu confiro nomes dos tons (BT Skin costuma ter linhas F/M/D com números tipo `F10`, `M20`, `D50` etc.) e imagens capturadas.
   - Se algum tom faltar, complemento manualmente antes de inserir.

4. **Baixar imagens para o bucket `product-images`**
   - Edge function `import-shopee-images`: faz `fetch` de cada URL de imagem da Shopee e faz `upload` no bucket `product-images` (caminho `bt-skin/<slug>-<i>.jpg`), retornando URLs públicas.
   - Necessário porque URLs da Shopee podem expirar / ter hotlink bloqueado.

5. **Inserir no banco** via `supabase--insert`
   - `products`: 1 registro
     - `name`: "Bruna Tavares BT Skin – Base Líquida Aveludada 40ml"
     - `slug`: `bt-skin-base-liquida-aveludada-40ml-<sufixo aleatório>` (padrão do projeto)
     - `sku`: `BTSKIN-40ML`
     - `retail_price`: 1, `cost_price`: 1
     - `stock`: 0 (estoque real fica nas variações)
     - `weight`: 0.08 (kg) — ajustável
     - `images`: array com URLs públicas do bucket
     - `short_description`, `description`: texto extraído
     - `is_active`: true, `status`: `draft` (você publica depois de ajustar preços)
   - `product_variants`: N registros (um por tom)
     - `name`: nome do tom (ex.: "F10", "M30")
     - `sku`: `BTSKIN-40ML-<TOM>`
     - `stock`: 100
     - `price_override`: null (herda do produto)
     - `images`: array com a imagem específica do tom (se houver)

6. **Verificação**
   - Rodar `SELECT` para confirmar produto + contagem de variações.
   - Passar o link do produto em `/admin/produtos/<id>` para você abrir e ajustar preços.

## Detalhes técnicos

- Edge functions ficam em `supabase/functions/scrape-shopee-product/` e `supabase/functions/import-shopee-images/`, ambas com CORS e validação Zod da URL.
- Segredos: Firecrawl é gerenciado (gateway), então apenas `LOVABLE_API_KEY` + `FIRECRAWL_API_KEY` (injetados pelo connector).
- Slug gerado com sufixo aleatório para respeitar o padrão de unicidade já usado na importação em lote.
- Estoque agregado do produto pai fica 0; a página de listagem do admin já mostra soma via variantes.
- Após confirmar sucesso, as duas edge functions ficam no projeto (úteis para próximos cadastros da Shopee); posso removê-las se preferir.

## O que preciso confirmar antes de executar

Se estiver tudo ok com esse plano, ao aprovar eu já disparo o card de conexão do Firecrawl e sigo os passos.
