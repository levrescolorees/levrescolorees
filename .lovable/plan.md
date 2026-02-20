
# Corrigir Deteccao de Pagamento Pix no Mercado Pago

## Problema Identificado

O pagamento Pix e processado com sucesso no Mercado Pago, mas o sistema nunca detecta que foi pago. Isso acontece por **dois motivos**:

1. **Webhook nao configurado**: Quando o `create-payment` cria o pagamento na API do Mercado Pago, ele nao envia o campo `notification_url`. Sem isso, o Mercado Pago nunca avisa seu sistema que o pagamento foi aprovado.

2. **Polling passivo**: O `payment-status` apenas le o status do banco de dados. Como o webhook nunca atualiza o banco, o polling sempre retorna "pending" — mesmo que o cliente ja tenha pago.

## Solucao

### 1. Adicionar `notification_url` no `create-payment`

Incluir a URL do webhook na chamada para a API do Mercado Pago para que ele envie notificacoes automaticas quando o pagamento for aprovado.

```
mpBody.notification_url = `https://jefuidilwgzsnifjgdaf.supabase.co/functions/v1/mp-webhook`
```

### 2. Tornar `payment-status` ativo

Em vez de apenas ler o banco, o `payment-status` tambem consultara a API do Mercado Pago diretamente quando o status ainda for "pending". Se detectar que foi pago, atualiza o banco na hora. Isso funciona como fallback caso o webhook falhe.

### 3. Corrigir polling no Checkout

Remover a chamada duplicada (`supabase.functions.invoke` + `fetch`) e usar apenas uma chamada limpa.

## Secao Tecnica

### Arquivos modificados

```text
supabase/functions/create-payment/index.ts  -- adicionar notification_url ao payload MP
supabase/functions/payment-status/index.ts  -- consultar MP API ativamente quando pending
src/pages/Checkout.tsx                       -- corrigir polling duplicado
```

### Fluxo corrigido

```text
create-payment envia notification_url para MP
        |
   [Pix pago]
        |
   Caminho A: MP envia webhook -> mp-webhook atualiza DB -> polling detecta "approved"
   Caminho B: polling chama payment-status -> consulta MP API -> atualiza DB -> retorna "approved"
```

### Detalhes de cada mudanca

**create-payment/index.ts:**
- Adicionar `notification_url` apontando para `mp-webhook` no corpo da requisicao a API do Mercado Pago

**payment-status/index.ts:**
- Se `payment_status === 'pending'` e existe `payment_id`, buscar o access_token da `store_settings`
- Fazer GET na API do MP (`/v1/payments/{payment_id}`)
- Se o status do MP for "approved", atualizar o pedido no banco
- Retornar o status atualizado

**Checkout.tsx:**
- Remover a chamada `supabase.functions.invoke` duplicada (linhas 182-186) que nao e usada
- Manter apenas o `fetch` direto que ja funciona corretamente
