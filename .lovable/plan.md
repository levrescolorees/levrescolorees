## Objetivo

Subir mais 2 produtos da Bruna Tavares no mesmo esquema do BT Skin (produto único + variações de tom com swatches reais).

## Produtos

1. **BT Multicover** — corretivo/base multifuncional (todos os tons do site)
2. **BT Skin Powder** — pó facial (todos os tons do site)

## Execução

- Refatorar a edge function `import-bt-skin` para uma versão genérica `import-bt-product` que aceita `slug` (ex.: `bt-multicover`, `bt-skinpowder`) e roda a mesma lógica: fetch VTEX API → upload imagens do produto + swatches → upsert `products` + `product_variants` → vincular em *Mais Vendidos*, *Novidades* e *Bruna Tavares*.
- Rodar a função 2x, uma para cada slug.
- Preço R$ 1,00, custo R$ 1,00, estoque 100 por variante, status `published`, `is_active = true` (você ajusta preços depois no admin).
- Nome dos tons no formato "Família Código" (ex.: "Medium M20") para o seletor de swatches por família continuar funcionando.

## Depois

Te envio os links de admin e de loja de cada um pra revisão.
