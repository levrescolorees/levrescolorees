

## Sistema de Emails com Resend

### Visão Geral

Criar uma edge function centralizada `send-email` que usa a API do Resend para enviar emails transacionais da loja. Os emails serão disparados automaticamente nos momentos certos do fluxo de compra.

### Emails a implementar

| Email | Gatilho |
|---|---|
| Confirmação de pedido | Após pagamento aprovado (dentro de `create-payment`) |
| Status atualizado | Admin muda status no `OrderDetail` |
| Código de rastreio | Admin insere rastreio no `OrderDetail` |
| Carrinho abandonado | Cron job / scheduled function (fase 2) |

> Recuperação de senha: já é tratada pelo Supabase Auth nativamente. Se quiser customizar o template, fazemos numa etapa separada.

### Pré-requisito: API Key do Resend

Será necessário adicionar o secret `RESEND_API_KEY` no Supabase. Você vai precisar criar uma conta em resend.com, verificar seu domínio e copiar a API key.

### Mudanças Técnicas

**1. Nova Edge Function: `supabase/functions/send-email/index.ts`**
- Recebe `{ to, subject, template, data }` via POST
- Usa a API REST do Resend (`https://api.resend.com/emails`)
- Templates em HTML inline (confirmação, status, rastreio)
- Remetente configurável via `store_settings` ou fallback para `noreply@seudominio.com`

**2. Modificar `supabase/functions/create-payment/index.ts`**
- Após criar o pedido com sucesso e pagamento aprovado, chamar `send-email` internamente (fetch para a própria edge function ou código inline)
- Enviar email de "Pedido Confirmado" com resumo dos itens, total e número do pedido

**3. Modificar `src/hooks/useOrders.ts` — `useUpdateOrderStatus`**
- Após atualização de status com sucesso, invocar `supabase.functions.invoke('send-email')` com os dados do pedido
- Enviar email informando novo status ao cliente

**4. Modificar `src/hooks/useOrders.ts` — `useUpdateTracking`**
- Após salvar rastreio com sucesso, invocar `send-email` com o código de rastreio
- Email com link para rastreamento dos Correios

**5. Atualizar `supabase/config.toml`**
- Adicionar configuração da nova function `send-email` com `verify_jwt = false`

### Templates de Email (HTML inline)

Todos os templates seguem o visual da marca com cores da loja:
- **Pedido Confirmado**: número do pedido, lista de itens, total, endereço
- **Status Atualizado**: novo status com barra de progresso visual
- **Rastreio Enviado**: código de rastreio + link direto para rastrear

### Fluxo

```text
Cliente compra → create-payment → pedido criado → send-email (confirmação)
Admin muda status → useUpdateOrderStatus → send-email (status)
Admin insere rastreio → useUpdateTracking → send-email (rastreio)
```

### Carrinho Abandonado (Fase 2)

Requer uma tabela `abandoned_carts` e uma scheduled function. Implementamos depois de validar os emails transacionais básicos.

