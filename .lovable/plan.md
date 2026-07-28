## O que vou cadastrar

Dados confirmados direto do site da Melu (JSON-LD estruturado, sem bloqueio de bot):

**1 produto:** Pó Solto Areia das Dunas — Melu Ruby Rose
- Descrição oficial: "Transforme sua maquiagem com o pó solto Areia das Dunas... textura aveludada e natural, alta fixação, acabamento soft focus..."
- Peso: 61 g (0,061 kg) — já vem do site, usado no cálculo do SuperFrete
- Preço de venda: **R$ 8,90** | Custo: R$ 1,00 (placeholder, ajustável no admin)
- Estoque: 100 por variante | Badge: "Novo" | Status: publicado

**3 variantes (tons):**

| Tom | SKU | EAN |
|---|---|---|
| Horizonte Místico | RRM404-1 | 7897840306118 |
| Encanto das Pedras | RRM404-3 | 7897840306132 |
| Calor do Nordeste | RRM404-4 | 7897840306149 |

Cada tom tem sua própria foto do potinho (imagem exclusiva), e há 4 imagens de campanha compartilhadas que vão para a galeria principal do produto.

## Como vou fazer

1. **Coleção nova "Ruby Rose / Melu"** via migração (não existe hoje no banco — só existem Blow, Boca Rosa, Bruna Tavares, Mais Vendidos, Mari Maria, Novidades). O produto será vinculado a ela.
2. **Nova edge function `import-melu-product`** (mesmo padrão das `import-bt-product` / `import-epoca-product`):
   - Faz fetch das 3 páginas de produto e lê o bloco JSON-LD (nome, descrição, peso, EAN) + extrai a galeria de imagens `_zoom`.
   - Baixa as imagens e sobe para o bucket `product-images` em `melu-areia-das-dunas/…` (nada de hotlink no CDN de terceiro).
   - Faz upsert do produto por SKU (`RRM404`) e das 3 variantes por SKU — rodar de novo não duplica.
   - Vincula à coleção Ruby Rose / Melu.
   - Registra em `supabase/config.toml` com `verify_jwt = false`, como as outras funções de importação.
3. Disparo a função e confirmo o resultado no banco.

## Detalhes técnicos

- A imagem exclusiva de cada tom vai em `product_variants.images[0]`, então o seletor de cores (`ColorSwatchPicker`) já mostra as 3 bolinhas automaticamente na página do produto.
- Galeria do produto (`products.images`): packshot do Horizonte Místico + as 4 imagens de campanha.
- Não há mapeamento de família de pele aqui (não é base), então o picker mostra apenas os 3 tons sem os filtros Fair/Light/etc.

## O que não muda

Nenhum produto existente, nenhum componente de front-end, nenhuma alteração de checkout/frete. Catálogo vai de 23 para 24 produtos.

## Validação

- Conferir no admin `/admin/produtos`: produto com thumbnail e 3 variantes com imagem.
- Conferir na loja: página do produto com os 3 tons selecionáveis e a foto trocando ao clicar.
