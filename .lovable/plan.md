## Objetivo

Editar **preço** e **estoque** direto na lista `/admin/produtos`, sem abrir o produto, registrando quem alterou e quando.

## Como vai funcionar

- As células de Preço e Estoque viram campos clicáveis. Clica → vira input → Enter (ou sair do campo) salva; Esc cancela.
- Salvamento otimista com toast de confirmação e reversão se der erro.
- Ao lado de cada valor alterado recentemente, um ícone de histórico mostra as últimas alterações (valor antigo → novo, usuário e data/hora).

## Log de alterações

Cada edição grava um registro na tabela `audit_logs` (que já existe e já permite inserção pelo app), com:
- ação: `product_price_updated` / `product_stock_updated`
- produto (id e nome), valor anterior e novo
- usuário logado (id + e-mail) e data/hora automática

Nada de novas tabelas nem migração.

## Detalhes técnicos

- `src/pages/admin/Products.tsx`: colunas Preço/Estoque passam a usar um novo componente `InlineEditCell` (`src/components/admin/InlineEditCell.tsx`) — input numérico, validação (preço ≥ 0 com 2 casas, estoque inteiro ≥ 0), estados de loading/erro.
- Novo hook `src/hooks/useInlineProductUpdate.ts`: faz `update` em `products` (`retail_price` / `stock` + `updated_at`), depois insere o registro em `audit_logs`, e invalida a query `['admin','products']` (a lista usa o RPC `admin_products_list`, então o refetch mantém tudo consistente).
- Novo componente `ProductAuditPopover` que consulta `audit_logs` filtrando por `entity_type = 'product'` e `entity_id`, ordenado por data, mostrando as 10 últimas alterações em PT-BR.
