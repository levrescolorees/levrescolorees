# Filiais (multi-tenant) nos Pedidos Manuais

## O que muda pra você
- Nova área **Filiais** em Configurações: criar e renomear filiais (ex.: Matriz, Loja Parceira X). Uma filial **Matriz** é criada automaticamente, e todos os clientes e pedidos atuais vão para ela.
- Ao criar um usuário **Vendedor**, **Expedição** ou **Gerente de filial**, você escolhe a filial. A vinculação é feita pelo sistema, e o usuário não consegue trocá-la.
- Vendedoras e expedição só veem **clientes e pedidos da própria filial**. O catálogo de produtos e o estoque continuam únicos para todas.
- Você (Super Admin) e os admins continuam vendo tudo, com um filtro de filial nas telas de Pedidos Manuais e Expedição.
- A loja online não muda: clientes que compram pelo site entram na Matriz.

## Regras
- Isolamento garantido no banco: mesmo que alguém tente contornar a tela, não lê nem grava dados de outra filial.
- O pedido manual recebe a filial de quem criou; o cliente escolhido precisa ser da mesma filial.
- O gerente de filial cadastra vendedoras só na própria filial.
- Anexos (pedido de compra) também ficam separados por filial.

## Detalhes técnicos
- Migration 1: adicionar `gerente` ao enum `app_role`.
- Migration 2:
  - `tenants` (id, name, slug, is_active, timestamps) + GRANTs + RLS (staff global vê todos; os demais só o próprio).
  - `profiles.tenant_id` (FK). Backfill de profiles, `customers` e `manual_orders` com a Matriz; `customers.tenant_id` com default da Matriz, para não quebrar o checkout (service role); `manual_orders.tenant_id NOT NULL`.
  - `get_current_tenant_id()` e `is_global_staff()` (admin/operador/financeiro), SECURITY DEFINER e STABLE.
  - Trigger que impede o usuário de alterar o próprio `profiles.tenant_id`.
  - Políticas reescritas em `customers`, `manual_orders`, `manual_order_items`, `manual_order_status_history`: `is_global_staff() OR tenant_id = get_current_tenant_id()`, cobrindo leitura e gravação. Itens e histórico herdam do pedido.
  - `create_manual_order` injeta `get_current_tenant_id()` e valida o tenant do cliente; `set_manual_order_status` valida o tenant.
  - Storage: caminho `tenant_id/...` no bucket `purchase-orders`; políticas que checam o primeiro segmento do caminho.
  - Índices em `tenant_id`.
- Edge `create-admin-user`: aceita `tenant_id`; o gerente só cria na própria filial; atualiza `profiles.tenant_id` com o service role.
- Front: CRUD de filiais em Configurações, seletor de filial na criação de usuário, upload com prefixo de tenant, filtro de filial para admins, e o perfil gerente vê Pedidos Manuais e Expedição da filial.
- Testes: regra de prefixo do caminho do anexo por filial.
