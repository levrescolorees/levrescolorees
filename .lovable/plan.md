

## Correção: Endpoint e payload da SuperFrete estão errados

### Problema identificado

Os logs mostram que a SuperFrete retorna **HTML** (a página web do painel) em vez de JSON. Isso acontece porque:

1. **Endpoint errado**: o código usa `/api/v0/order` mas o endpoint correto é **`/api/v0/cart`**
2. **Campo de dimensões errado**: o código envia `package` mas o campo correto é **`volumes`**

### Correção

**`supabase/functions/generate-shipping-label/index.ts`**

| Item | Atual (errado) | Correto |
|------|----------------|---------|
| Endpoint | `/api/v0/order` | `/api/v0/cart` |
| Campo dimensões | `package: { weight, height, width, length }` | `volumes: { weight, height, width, length }` |

### Observação importante da documentação

A etiqueta é criada com status **"pending"** (aguardando pagamento na SuperFrete). O código de rastreio só fica disponível quando o status muda para **"released"** (após pagar a etiqueta no painel SuperFrete ou via API de checkout). Ou seja, o fluxo completo é:

1. `POST /api/v0/cart` → cria etiqueta com status "pending"
2. Pagar a etiqueta (painel SuperFrete ou API `/api/v1/integration/checkout`)
3. Após pagamento, status muda para "released" e o tracking code fica disponível

O código atual tenta pegar o tracking_code na resposta do POST, mas ele só estará disponível após o pagamento da etiqueta.

