

## Planilha com 6 colunas de imagem individuais

### Problema atual
A coluna `Imagens` usa URLs separadas por `|` numa unica celula. Isso e confuso no Excel/Google Sheets — o usuario prefere ter colunas separadas para cada foto.

### Mudanca proposta

Substituir a coluna unica `Imagens` por 6 colunas individuais: `Imagem 1`, `Imagem 2`, `Imagem 3`, `Imagem 4`, `Imagem 5`, `Imagem 6`.

### Arquivo: `src/pages/admin/Products.tsx`

**1. Template CSV (`downloadTemplate`)**
- Header: `...;Imagem 1;Imagem 2;Imagem 3;Imagem 4;Imagem 5;Imagem 6`
- Exemplo com 2 URLs preenchidas e 4 vazias

**2. Parser (`parseRows`)**
- Buscar colunas `imagem 1` ate `imagem 6` (alem de manter compatibilidade com `imagens` separadas por `|`)
- Montar o array `images` a partir das 6 colunas individuais, filtrando vazias
- Se nenhuma coluna individual for encontrada, cai no fallback da coluna `imagens` com `|`

**3. Exportacao (`exportCSV`)**
- Substituir a coluna unica `Imagens` pelas 6 colunas `Imagem 1` a `Imagem 6`
- Distribuir o array `images` do produto entre as 6 colunas

**4. Preview da importacao**
- Nenhuma mudanca necessaria — o preview ja mostra os dados parseados

### Exemplo do novo template

```text
Nome;SKU;Preco Custo;Preco Venda;Estoque;Descricao Curta;Descricao;Badge;Status;Revenda;Margem Sugerida;Rating;Reviews;SEO Titulo;Meta Descricao;Imagem 1;Imagem 2;Imagem 3;Imagem 4;Imagem 5;Imagem 6
Batom Matte Rosa;SKU-001;25,00;49,90;100;Batom matte;Descricao longa;Mais Vendido;ativo;sim;50;4.8;120;SEO Title;Meta desc;https://ex.com/foto1.jpg;https://ex.com/foto2.jpg;;;;
```

### Compatibilidade
- O parser continua aceitando a coluna antiga `Imagens` com `|` como fallback
- Se o usuario usar o formato antigo, funciona normalmente

