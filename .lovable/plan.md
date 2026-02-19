

# Plano de Implementacao - Admin Shopify-Like para Levres Colorees

Este e um projeto grande. Para garantir qualidade e estabilidade, vamos dividir em **4 fases** incrementais. Cada fase entrega valor funcional e pode ser testada antes de avancar.

---

## Estado Atual

Hoje o projeto e 100% frontend com dados hardcoded em `src/data/products.ts`. Nao ha banco de dados, autenticacao nem painel admin. Precisamos construir toda a infraestrutura backend.

---

## Fase 1 - Fundacao (Backend + Auth + Produtos no DB)

**Objetivo**: Conectar Lovable Cloud, criar banco de dados, autenticacao admin e CRUD de produtos.

### Backend (Lovable Cloud / Supabase)

- Ativar Lovable Cloud no projeto
- Criar tabelas no banco:
  - `products` (nome, slug, sku, descricao curta/longa, preco varejo, imagens, rating, reviews, ativo, estoque, badges, ideal_revenda, margem_sugerida)
  - `product_variants` (product_id, cor/modelo, sku, preco_override, estoque, imagens)
  - `price_rules` (product_id, min_quantity, price, label, ativo)
  - `collections` (nome, slug, descricao, imagem, tipo: manual/automatica, ordem, condicoes)
  - `collection_products` (collection_id, product_id, ordem)
  - `user_roles` (user_id, role enum: admin/operador/financeiro)
  - `profiles` (user_id, nome, email)
- RLS policies com funcao `has_role()` para proteger acesso
- Seed data com os 6 produtos existentes migrados para o banco

### Autenticacao

- Pagina `/admin/login` com email/senha
- Protecao de rotas `/admin/*` via auth guard
- RBAC: admin, operador, financeiro

### Admin - Layout Base

- Sidebar com navegacao (Dashboard, Produtos, Colecoes, Pedidos, Clientes, Cupons, Configuracoes, Midia)
- Header com nome do usuario e logout
- Rota `/admin` com layout protegido

### Admin - CRUD Produtos

- Listagem com busca, filtros (colecao, status), paginacao
- Formulario criar/editar produto com todos os campos
- Upload de imagens via Supabase Storage
- Gerenciamento de variantes (cor, modelo) com estoque individual
- Regras de preco por quantidade (editavel por produto)
- Ativar/desativar produto

### Storefront Adaptado

- Migrar storefront para buscar dados do banco (react-query)
- Manter toda a UX premium existente
- Precos dinamicos vindo das `price_rules` do banco

---

## Fase 2 - Colecoes, Pedidos e Carrinho Persistente

### Admin - CRUD Colecoes

- Criar/editar colecoes manuais (selecionar produtos) e automaticas (por tags/condicoes)
- Upload de imagem da colecao
- Ordenacao drag-and-drop

### Sistema de Pedidos

- Tabelas: `orders`, `order_items`, `order_status_history`
- Checkout grava pedido no banco com status "pendente"
- Admin: listagem de pedidos com filtros por status
- Detalhe do pedido: itens, precos aplicados, dados do cliente, endereco
- Acoes: atualizar status, inserir rastreio
- Exportar pedidos CSV

### Clientes

- Tabela `customers` (nome, email, cpf/cnpj, telefone, tag revendedor)
- Admin: listagem com historico de compras
- Marcar como revendedor

---

## Fase 3 - Cupons, Frete, Theme Editor

### Cupons e Promocoes

- Tabela `coupons` (codigo, tipo percentual/fixo, validade, minimo compra, colecao especifica, primeira compra, limite uso)
- Admin: CRUD de cupons
- Storefront: campo de cupom no carrinho/checkout

### Frete

- Tabela `shipping_rules` (tipo: fixo/por estado/frete gratis acima de X)
- Admin: configurar regras
- Checkout: calculo automatico

### Theme Editor (Configuracoes da Loja)

- Tabela `store_settings` (chave/valor JSON)
- Admin: editor visual para:
  - Logo, favicon, nome da marca
  - Cores primaria/secundaria
  - Conteudo da home (headline, subheadline, banners, beneficios, CTA)
  - Menu/navegacao
  - Rodape
  - Textos legais (politicas, FAQ)
- Storefront: carregar configuracoes do banco dinamicamente

---

## Fase 4 - Dashboard, Midia, Import/Export, Polish

### Dashboard Admin

- Metricas: pedidos (hoje/semana/mes), ticket medio, faturamento
- Produtos mais vendidos (grafico)
- Alertas de estoque baixo
- Pedidos pendentes

### Biblioteca de Midia

- Upload centralizado com Supabase Storage
- Organizacao por tags
- Reaproveitamento em produtos e home

### Import/Export

- Importar produtos via CSV
- Exportar produtos/pedidos/clientes

### Pagamentos (modo simulado)

- Tabela `payment_methods` configuravel
- Modo simulado para Pix/Cartao/Boleto
- Preparado para integracao com gateway real

---

## Detalhes Tecnicos

### Estrutura de Pastas (nova)

```text
src/
  pages/
    admin/
      AdminLogin.tsx
      AdminLayout.tsx
      Dashboard.tsx
      Products.tsx
      ProductForm.tsx
      Collections.tsx
      Orders.tsx
      OrderDetail.tsx
      Customers.tsx
      Coupons.tsx
      Settings.tsx
      Media.tsx
  components/
    admin/
      AdminSidebar.tsx
      AdminHeader.tsx
      ProductTable.tsx
      OrderTable.tsx
      ...
  hooks/
    useProducts.ts
    useCollections.ts
    useOrders.ts
    ...
```

### Banco de Dados (principais tabelas)

```text
profiles          -> user_id, nome, email
user_roles        -> user_id, role (admin/operador/financeiro)
products          -> id, nome, slug, sku, descricoes, precos, estoque, ativo, badges
product_variants  -> id, product_id, nome, sku, preco, estoque, imagens
price_rules       -> id, product_id, min_qty, price, label, ativo
collections       -> id, nome, slug, tipo, condicoes, imagem, ordem
collection_products -> collection_id, product_id, ordem
orders            -> id, customer_id, status, total, frete, pagamento, rastreio
order_items       -> id, order_id, product_id, variant_id, qty, preco_unitario
customers         -> id, nome, email, cpf_cnpj, telefone, is_revendedor
coupons           -> id, codigo, tipo, valor, validade, min_compra, ativo
shipping_rules    -> id, tipo, valor, estado, min_frete_gratis
store_settings    -> id, chave, valor (JSON)
media             -> id, url, nome, tags, created_at
```

### Seguranca

- RLS em todas as tabelas
- Funcao `has_role(user_id, role)` security definer
- Roles em tabela separada (nunca no profiles)
- Admin routes protegidas por auth guard no frontend + RLS no backend
- Confirmacao para acoes destrutivas

---

## Recomendacao

Sugiro comecar pela **Fase 1** que ja entrega: banco de dados funcionando, autenticacao admin, CRUD de produtos completo e storefront conectado ao banco. Isso substitui os dados hardcoded e da autonomia real para gerenciar produtos.

Confirme para iniciar a Fase 1.

