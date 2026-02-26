

## Planilha completa com Preço de Custo e todos os campos do produto

### Problema
A planilha modelo atual nao tem campo de preco de custo — so tem preco de venda (retail_price). Alem disso, faltam outros campos uteis como rating, reviews, margem sugerida, ideal para revenda, SEO title e meta description.

### Mudancas necessarias

**1. Adicionar coluna `cost_price` na tabela `products` (migracao SQL)**
A tabela `products` atualmente nao tem campo de preco de custo. Precisamos adicionar:
```sql
ALTER TABLE products ADD COLUMN cost_price numeric NOT NULL DEFAULT 0;
```

**2. Atualizar o template CSV para incluir todos os campos**
Nova estrutura completa da planilha:
```text
Nome;SKU;Preco Custo;Preco Venda;Estoque;Descricao Curta;Descricao;Badge;Status;Revenda;Margem Sugerida;Rating;Reviews;SEO Titulo;Meta Descricao;Imagens
```

**3. Atualizar o parser CSV**
Adicionar mapeamento para os novos campos:
- `Preco Custo` / `cost_price` / `custo` → `cost_price`
- `Revenda` / `ideal_for_resale` → boolean (sim/nao)
- `Margem Sugerida` / `suggested_margin` → numero
- `Rating` → numero
- `Reviews` → numero
- `SEO Titulo` / `seo_title` → texto
- `Meta Descricao` / `meta_description` → texto

**4. Atualizar o ProductForm e PricingCard**
Incluir o campo `cost_price` no formulario de edicao individual do produto, ao lado do preco de venda.

**5. Atualizar a exportacao CSV**
Incluir os novos campos na exportacao tambem.

### Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| Migracao SQL | `ALTER TABLE products ADD COLUMN cost_price` |
| `src/pages/admin/Products.tsx` | Template, parser, preview, exportacao |
| `src/components/admin/product-editor/PricingCard.tsx` | Campo cost_price no formulario |
| `src/pages/admin/ProductForm.tsx` | FormData + buildProductData com cost_price |
| `src/hooks/useProducts.ts` | Tipo DBProduct com cost_price (se necessario) |

### Template modelo (exemplo de como fica no Excel)

```text
Nome;SKU;Preco Custo;Preco Venda;Estoque;Descricao Curta;Descricao;Badge;Status;Revenda;Margem Sugerida;Rating;Reviews;SEO Titulo;Meta Descricao;Imagens
Batom Matte Rosa;SKU-001;25,00;49,90;100;Batom matte;Batom de longa duracao com acabamento matte;Mais Vendido;ativo;sim;50;4.8;120;Batom Matte Rosa - Levres;Batom matte de longa duracao;https://exemplo.com/foto1.jpg|https://exemplo.com/foto2.jpg
Gloss Labial Nude;SKU-002;18,00;39,90;50;Gloss nude;Gloss com brilho natural;;ativo;nao;0;0;0;;;
```

