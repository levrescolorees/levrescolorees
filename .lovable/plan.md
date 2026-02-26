

## Imagens na importação em massa

### Situação atual
O modelo CSV atual não inclui coluna de imagens. A tabela `products` tem um campo `images` (array de URLs de texto), então as imagens precisam já estar hospedadas em algum lugar (URL pública) para serem referenciadas.

### Opções de abordagem

Existem duas formas viáveis:

**Opção A — Coluna "Imagens" no CSV com URLs**
- Adicionar coluna `Imagens` ao modelo CSV
- O cliente coloca URLs públicas das imagens (separadas por `|` quando múltiplas)
- Exemplo: `https://exemplo.com/foto1.jpg|https://exemplo.com/foto2.jpg`
- Simples de implementar, mas exige que as imagens já estejam hospedadas em algum lugar

**Opção B — Upload em lote de imagens + associação por SKU (recomendada)**
- Adicionar uma seção de "Upload de Imagens em Lote" na página de Produtos
- O cliente arrasta/solta múltiplas imagens de uma vez
- As imagens são enviadas ao bucket `product-images` do Supabase Storage
- Nomeação por convenção: o nome do arquivo deve conter o SKU (ex: `SKU-001-frente.jpg`, `SKU-001-verso.jpg`)
- Após o upload, o sistema associa automaticamente as imagens aos produtos pelo SKU
- Pode funcionar junto com o CSV: primeiro importa o CSV, depois faz upload das imagens em lote

### Plano de implementação (Opção B — upload em lote)

**Arquivo: `src/pages/admin/Products.tsx`**

1. Adicionar coluna `Imagens` ao template CSV para quem quiser usar URLs diretas (separadas por `|`)
2. No parser, mapear a coluna `imagens`/`images` e fazer split por `|` para preencher o array `images` do produto

**Arquivo: `src/pages/admin/Products.tsx` (novo componente inline ou separado)**

3. Adicionar botao "Upload Imagens em Lote" que abre um Dialog
4. Área de drag-and-drop para múltiplos arquivos de imagem
5. Listar os arquivos selecionados com preview de thumbnail
6. Ao confirmar, fazer upload de cada arquivo para `product-images` bucket
7. Extrair o SKU do nome do arquivo (parte antes do primeiro `-` ou `_` após o padrão SKU)
8. Buscar o produto com aquele SKU e adicionar a URL pública ao array `images`

### Mudancas tecnicas

- **Template CSV**: Nova coluna `Imagens` com exemplo `https://exemplo.com/foto.jpg`
- **Parser**: `findCol(headers, 'imagens', 'images', 'fotos')` → split por `|` → array de strings
- **Upload em lote**: Novo Dialog com input `multiple` accept `image/*`, upload ao Supabase Storage, match por SKU, update na tabela `products`
- **Convenção de nome**: `{SKU}-{qualquer-coisa}.jpg` → associa ao produto com aquele SKU

### Fluxo do cliente

1. Baixa o modelo CSV
2. Preenche os produtos (pode deixar coluna Imagens vazia)
3. Importa o CSV
4. Clica em "Upload Imagens em Lote"
5. Arrasta as fotos nomeadas com o SKU
6. Sistema associa automaticamente

