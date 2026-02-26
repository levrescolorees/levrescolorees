

## Exclusao em massa de produtos

### O que sera feito

Adicionar checkboxes na tabela de produtos do admin para selecionar multiplos produtos e exclui-los de uma vez so.

### Mudancas no arquivo `src/pages/admin/Products.tsx`

**1. Estado de selecao**
- Novo state `selectedIds: Set<string>` para rastrear quais produtos estao selecionados
- Funcoes `toggleSelect(id)`, `toggleAll()`, `clearSelection()`

**2. Checkbox no header da tabela**
- Nova coluna `<th>` com um `<Checkbox>` que seleciona/deseleciona todos os produtos filtrados de uma vez

**3. Checkbox em cada linha**
- Nova coluna `<td>` com `<Checkbox>` vinculado ao `selectedIds`

**4. Barra de acoes em massa**
- Quando `selectedIds.size > 0`, mostrar uma barra fixa acima da tabela com:
  - Texto: "X produto(s) selecionado(s)"
  - Botao "Excluir selecionados" (vermelho/destructive)
  - Botao "Limpar selecao"
- Ao clicar em "Excluir selecionados", abre um `AlertDialog` de confirmacao
- Ao confirmar, faz `supabase.from('products').delete().in('id', [...selectedIds])`
- Apos sucesso, invalida a query e limpa a selecao

**5. Ajuste de colSpan**
- Atualizar o `colSpan` das linhas de loading/vazio de 7 para 8 (nova coluna de checkbox)

### Fluxo do usuario

1. Marca os checkboxes dos produtos que quer excluir (ou marca todos pelo header)
2. Aparece barra com "X selecionados" e botao "Excluir selecionados"
3. Clica em excluir, confirma no dialog
4. Produtos sao removidos do banco e a lista atualiza

### Detalhes tecnicos

- Usa o componente `Checkbox` do shadcn/ui (ja existe em `src/components/ui/checkbox.tsx`)
- Delete via `supabase.from('products').delete().in('id', ids)` — respeita as RLS policies existentes (Admin/Operador can delete)
- Invalida `['admin', 'products']` apos exclusao
- A selecao e limpa automaticamente apos a exclusao ou quando o filtro de busca muda

