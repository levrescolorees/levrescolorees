

## Auditoria: Geração de Etiqueta de Envio (SuperFrete)

### Situação Atual

Após revisar todo o código do projeto, **não existe nenhuma funcionalidade de geração de etiqueta de envio**. O fluxo atual é:

1. **Checkout**: cliente calcula frete via SuperFrete (endpoint `calculate-shipping`) → apenas **cotação de preço**
2. **Pedido criado**: salvo no banco com valor do frete
3. **Admin → Detalhe do Pedido**: o admin pode manualmente digitar um código de rastreio e atualizar o status

**O que falta**: Após o pedido ser confirmado/pago, não há integração com a API SuperFrete para **gerar a etiqueta de envio** (`POST /api/v0/order`). Hoje o admin precisaria ir ao painel da SuperFrete manualmente, criar a etiqueta lá, e voltar para colar o código de rastreio.

### Plano: Integrar Geração de Etiqueta SuperFrete

**1. Nova Edge Function `generate-shipping-label`**

Cria a etiqueta via API SuperFrete (`POST /api/v0/order`) com os dados do pedido:
- Dados do destinatário (nome, endereço, CEP)
- Dados do remetente (CEP de origem das configurações)
- Dimensões/peso dos produtos do pedido
- Serviço selecionado (PAC/SEDEX/Mini Envios)
- Retorna: URL da etiqueta, código de rastreio, ID da ordem SuperFrete

**2. Salvar dados da etiqueta no pedido**

Adicionar coluna `shipping_label` (jsonb) na tabela `orders` para armazenar:
- `superfrete_order_id`
- `tracking_code`
- `label_url` (URL do PDF da etiqueta)
- `service_name`
- `status`

**3. Salvar serviço de frete selecionado no checkout**

Atualmente o checkout não salva qual serviço de frete o cliente escolheu (PAC, SEDEX, etc.). Precisamos salvar `shipping_method` (nome do serviço) junto com o pedido para saber qual etiqueta gerar.

**4. Botão "Gerar Etiqueta" no Admin → Detalhe do Pedido**

Quando o pedido estiver com status `confirmado` ou `preparando`:
- Botão "Gerar Etiqueta SuperFrete"
- Chama a edge function
- Exibe link para download do PDF da etiqueta
- Preenche automaticamente o código de rastreio

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Adicionar coluna `shipping_label` (jsonb) e `shipping_method` (text) na tabela `orders` |
| `src/pages/Checkout.tsx` | Salvar `shipping_method` no payload |
| `supabase/functions/create-payment/index.ts` | Aceitar e salvar `shipping_method` |
| `supabase/functions/generate-shipping-label/index.ts` | **Nova** — gerar etiqueta via SuperFrete API |
| `supabase/config.toml` | Registrar nova function |
| `src/pages/admin/OrderDetail.tsx` | Botão "Gerar Etiqueta" + exibir link da etiqueta |
| `src/hooks/useOrders.ts` | Mutation para gerar etiqueta |

### Observação Importante

A API de geração de etiqueta da SuperFrete (`/api/v0/order`) requer que a conta tenha saldo ou créditos. Em ambiente sandbox funciona sem custo para testes.

