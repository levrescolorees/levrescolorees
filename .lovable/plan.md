

## Modelo CSV no formato brasileiro para Excel

### Problema
O Excel brasileiro usa ponto-e-vírgula (`;`) como separador de colunas (porque a vírgula é o separador decimal no Brasil). O template atual usa vírgula, o que faz o Excel abrir tudo numa coluna só.

### Mudanças

**Arquivo: `src/pages/admin/Products.tsx`**

1. **Template (`downloadTemplate`)**: Trocar separador de `,` para `;`, usar vírgula como decimal nos preços (`49,90` em vez de `49.90`), e adicionar BOM UTF-8 (`\uFEFF`) no início para o Excel reconhecer acentos corretamente. Mudar extensão para `.csv` mas com encoding correto.

2. **Parser (`parseCSVLine`)**: Detectar automaticamente se o arquivo usa `;` ou `,` como separador (verificando a primeira linha/header) e parsear de acordo. Isso garante compatibilidade tanto com CSVs brasileiros quanto internacionais.

3. **Parser de preço**: Ao ler o campo de preço, tratar vírgula como decimal (`49,90` → `49.90`) antes de converter para número.

### Detalhes técnicos

**`downloadTemplate()`** — gerar com `;` e BOM:
```
\uFEFF
Nome;SKU;Preco;Estoque;Descricao;Descricao Curta;Badge;Status
Batom Matte Rosa;SKU-001;49,90;100;Batom de longa duração;Batom matte;Mais Vendido;ativo
Gloss Labial Nude;SKU-002;39,90;50;Gloss com brilho natural;Gloss nude;;ativo
```

**`parseCSVLine()`** — auto-detectar separador:
- Contar ocorrências de `;` e `,` na linha de headers
- Usar o que tiver mais ocorrências como separador
- Passar o separador detectado para todas as linhas

**Preço** — normalizar decimal:
- Substituir `,` por `.` no valor do preço antes do `Number()`

### Impacto
- O modelo baixado abrirá corretamente no Excel brasileiro com colunas separadas
- A importação continuará funcionando tanto com CSV brasileiro (`;`) quanto internacional (`,`)

