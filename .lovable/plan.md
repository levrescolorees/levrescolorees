

## Adicionar produtos a coleções em massa

### O que será feito

Quando o usuario selecionar produtos na lista do admin (checkboxes que ja existem), alem do botao "Excluir selecionados", aparecera um novo botao "Adicionar a coleção". Ao clicar, abre um dialog com a lista de coleções disponiveis para escolher. Ao confirmar, todos os produtos selecionados serao vinculados a coleção escolhida via tabela `collection_products`.

### Detalhes tecnicos

**Arquivo: `src/pages/admin/Products.tsx`**

1. Importar `useCollections` de `@/hooks/useProducts` e `Select` components
2. Adicionar estados: `bulkCollectionOpen` (boolean) e `selectedCollectionId` (string)
3. Na barra de ações em massa (linha ~378), adicionar botao "Adicionar a coleção" ao lado do "Excluir selecionados"
4. Adicionar um `Dialog` com um `Select` listando as coleções ativas
5. Na confirmação: inserir registros em `collection_products` para cada produto selecionado + coleção escolhida, ignorando duplicatas (usando `upsert` ou filtrando existentes)
6. Invalidar queries de collections e products após sucesso

**Logica de insert:**
- Para cada `product_id` em `selectedIds`, inserir `{ collection_id, product_id }` na tabela `collection_products`
- Usar `.upsert()` com `onConflict` ou fazer insert com `ignoreDuplicates: true` para evitar erro se o produto ja esta na coleção
- Como a tabela pode nao ter constraint unique em (collection_id, product_id), primeiro buscar os registros existentes e inserir apenas os novos

**UI do dialog:**
- Titulo: "Adicionar a coleção"
- Select dropdown com todas as coleções ativas
- Botões "Cancelar" e "Confirmar"
- Toast de sucesso com contagem

