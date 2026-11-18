# Módulo de Pedidos Manuais (Vendas → Expedição)

## O que muda pra você
- Novo menu **Pedidos Manuais** no admin: o vendedor escolhe o cliente, adiciona produtos (qtd + preço), anexa o Pedido de Compra (PDF/DOC/DOCX, obrigatório) e escreve observações.
- Novo menu **Expedição**: quadro com 3 colunas — Recebido, Em Separação, Despachado — do mais antigo pro mais novo. Cada cartão tem botão "Abrir pedido de compra" e botão para avançar o status.
- Dois novos perfis de usuário: **Vendedor** e **Expedição**, atribuíveis na tela de usuários. Admin vê tudo.
- Histórico: cada mudança de status registra quem fez e quando.

## Regras
- Vendedor: cria pedidos e vê os seus; não muda status.
- Expedição: vê todos os pedidos e só avança status na ordem Recebido → Em Separação → Despachado (sem pular, sem voltar; admin pode voltar).
- Pedido e itens são gravados juntos — ou salva tudo, ou nada.
- Anexo fica em área privada; só equipe logada abre (link temporário).

## Detalhes técnicos
- Tabelas separadas do checkout da loja para não afetar pedidos online: `manual_orders` (customer_id → customers, status enum `manual_order_status`: recebido/em_separacao/despachado, attachment_path, notes, created_by, assigned_to, timestamps), `manual_order_items` (product_id, variant_id, quantity, unit_price), `manual_order_status_history`.
- Adicionar `vendedor` e `expedicao` ao enum `app_role`; atualizar `is_staff` e edge function de gestão de usuários.
- RLS com `has_role`; GRANTs para authenticated/service_role.
- RPC `create_manual_order(customer_id, items jsonb, attachment_path, notes)` SECURITY DEFINER em transação única; RPC `advance_manual_order_status(order_id)` validando transição + histórico.
- Bucket privado `purchase-orders` (limite 10MB, mime PDF/DOC/DOCX); upload antes do RPC, remoção se falhar; abertura via `createSignedUrl`.
- Páginas: `admin/ManualOrders.tsx`, `admin/ManualOrderNew.tsx`, `admin/Expedition.tsx` (kanban, React Query), rotas com import direto e itens no menu filtrados por perfil.
- Busca de cliente com opção de cadastrar cliente rápido.
