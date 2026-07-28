## Objetivo

Cadastrar 3 produtos da linha **Glass (Ruby Rose)** no catálogo, cada um com todos os tons como variantes, imagens próprias no bucket e vínculo à coleção **Ruby Rose / Melu** — igual ao fluxo já usado nos imports anteriores.

## Produtos e tons confirmados no site

**1. Pó Compacto Glass — HB863 — venda R$ 6,99 — 12 tons**
GPF10, GPF20, GPL10, GPL20, GPM10, GPM20, GPM30, GPT10, GPT20, GPD10, GPD20, GPD30

**2. Pó Solto Glass — HB862 — venda R$ 6,99 — 4 tons**
GPF01, GPL02, GPM03, GPT04

**3. Bronzer e Iluminador Marmorizado Glass — HBF1605 — 2 variantes**
HBF16051 e HBF16052 — custo R$ 1,00, preço de venda provisório R$ 1,00 (você ajusta depois no admin)

Peso vindo do JSON-LD do site (0,05 kg pó compacto/bronzer; 0,073 kg pó solto). Estoque 100 por variante. Badge "Novo".

## Como será feito

Reaproveitar a edge function genérica `import-cdnlive-product`, que já sabe ler o tema do rubyrosemaquiagem.com.br (galeria `class="gallery"`, imagens `_zoom`) e o JSON-LD de descrição/peso.

1. Adicionar 3 novas entradas no mapa `PRODUCTS`: `glass-po-compacto`, `glass-po-solto`, `glass-bronzer`, com nome, SKU pai, preço, prefixo de storage e a lista de tons (nome + SKU + URL).
2. Fazer o custo (`costPrice`) configurável por produto (hoje é fixo 1) — para os três ficará R$ 1,00.
3. Deploy da função e execução de um import por chave.
4. Verificação por SQL: contagem de produtos, variantes, imagens por variante e vínculo na coleção.

## Detalhes técnicos

- Cada página de tom é raspada individualmente; só as imagens da galeria daquela página entram na variante (evita fotos de produtos relacionados, problema já corrigido antes).
- Galeria principal do produto = união das imagens dos tons, na ordem das variantes.
- Upsert por SKU: se rodar de novo, atualiza em vez de duplicar.
- Vínculo com a coleção `ruby-rose-melu` só é criado se ainda não existir.
- Storage: `product-images/glass-po-compacto/…`, `glass-po-solto/…`, `glass-bronzer/…`.

## Fora do escopo

- O link da Nova Era não será usado como fonte: o mesmo item (HBF16051) existe no site oficial da Ruby Rose com fotos e dados melhores, e é de lá que ele será importado.
- Ajuste final de preço dos bronzers fica com você no admin.
