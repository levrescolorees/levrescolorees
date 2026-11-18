# Lista de Separação (Romaneio) na Expedição

## O que muda pra você
- Cada cartão da Expedição ganha o botão **"Gerar Lista de Separação"**. Ele abre uma página limpa, com letras grandes e pensada para celular ou tablet no estoque.
- A lista mostra o cabeçalho do pedido (número, data e filial), o cliente (nome, empresa, telefone e documento), as observações logísticas e uma tabela com **SKU, produto, variação e quantidade**, ordenada por SKU para facilitar o caminho no estoque.
- Cada item tem uma **caixa grande para marcar**. O operador toca na linha inteira para marcar, e uma barra mostra o progresso (ex.: 2/5 itens separados). As marcações ficam salvas no aparelho, então não se perdem se a página recarregar.
- Se o pedido ainda estiver em "Recebido", abrir a lista já o move para **Em Separação**.
- Ao marcar todos os itens, aparece o botão verde grande **"Concluir Separação (Mover para Despachado)"**.
- O botão **"Imprimir Romaneio"** gera uma folha limpa: sem menus nem botões, com cabeçalho, cliente, tabela com quadradinhos para marcar à caneta e campos de "Separado por" e "Conferido por".

## Detalhes técnicos
- Nova rota `/admin/expedicao/:id/separacao` (`PickingList.tsx`), permitida para expedição, gerente e admin. Ela fica dentro do layout do admin, e o menu é escondido na impressão.
- Hook `usePickingList(id)`: lê `manual_orders` + `customers` + `tenants` + `manual_order_items` com JOIN em `products(sku)` e `product_variants(sku)`; o SKU da variação tem prioridade.
- O checklist fica em `localStorage` (`picking:<orderId>`), com a lista de ids de itens marcados.
- A transição usa a RPC existente `set_manual_order_status` (no projeto ela tem esse nome, não `advance_manual_order_status`): `em_separacao` ao abrir a lista se o pedido estiver em `recebido`, e `despachado` ao concluir. Depois disso, o checklist local é limpo e a tela volta ao Kanban.
- CSS `@media print` em `index.css`: esconde `.no-print`, a barra lateral e o cabeçalho do admin, zera o padding e o fundo, usa fonte preta, evita quebra de linha da tabela entre páginas, e `@page { margin: 12mm }`. Na impressão, os checkboxes viram quadrados vazios.
- Teste: a regra "todos marcados libera concluir" e o cálculo do progresso numa função pura `pickingProgress(items, checked)`.
