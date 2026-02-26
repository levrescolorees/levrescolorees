

## Importacao inteligente: SKU duplicado atualiza produto existente

### O que muda

Quando o CSV contem um SKU que ja existe no banco, em vez de falhar, o sistema atualiza o produto existente com os novos dados da planilha. Produtos sem SKU ou com SKU novo continuam sendo inseridos normalmente.

### Mudancas no arquivo `src/pages/admin/Products.tsx`

**1. `confirmImport` — logica de upsert por SKU**

Antes de inserir, separar os registros em dois grupos:
- **Com SKU**: buscar no banco quais SKUs ja existem via `supabase.from('products').select('id, sku').in('sku', skus)`
- **SKU existente** → fazer `update` no produto correspondente (sem alterar slug nem id)
- **SKU novo ou sem SKU** → fazer `insert` como ja faz hoje

Fluxo detalhado:
1. Coletar todos os SKUs nao-nulos dos registros validos
2. Consultar o banco: `SELECT id, sku FROM products WHERE sku IN (...)`
3. Montar um mapa `skuToId: Record<string, string>`
4. Separar `toInsert` (sem SKU ou SKU novo) e `toUpdate` (SKU ja existe)
5. Para cada item em `toUpdate`, fazer `supabase.from('products').update({...}).eq('id', skuToId[sku])`
6. Para `toInsert`, manter o insert em batches como ja esta

**2. Feedback ao usuario**

Toast final mostra contagem separada:
- "X produto(s) importado(s), Y atualizado(s)"
- Se houver falhas: "Z falharam"

**3. Preview — indicar quais serao atualizados**

No dialog de preview, marcar com um badge "Atualizar" os produtos cujo SKU ja existe, e "Novo" os demais. Isso requer buscar os SKUs existentes no momento do parse/preview.

### Exemplo de fluxo

1. Usuario importa CSV com 10 produtos, 3 deles tem SKU que ja existe no banco
2. Preview mostra: 7 novos, 3 atualizacoes
3. Ao confirmar: 7 sao inseridos, 3 sao atualizados
4. Toast: "7 importado(s), 3 atualizado(s)!"

### Nenhuma mudanca no banco

Nao ha constraint unique no SKU atualmente, entao a logica de match e feita no codigo. O update usa o `id` do produto encontrado.

