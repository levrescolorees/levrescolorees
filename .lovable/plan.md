

## Corrigir: Frete do SuperFrete não é enviado para a edge function de pagamento

### Problema

O frontend calcula o frete corretamente (usando SuperFrete ou regras estáticas) e exibe no resumo do checkout. Porém, ao enviar o payload para `create-payment`, **o valor do frete selecionado não é incluído**. A edge function recalcula o frete usando apenas as `shipping_rules` estáticas do banco, ignorando completamente o preço do SuperFrete que o cliente viu e aceitou.

Resultado: o Pix é gerado com valor menor (sem frete ou com frete diferente).

### Solução

Enviar o valor do frete selecionado do frontend para o backend, e usá-lo na edge function.

**1. Frontend — `src/pages/Checkout.tsx`**
- Adicionar `shipping_cost` ao payload enviado para `create-payment` (linha ~437):
  ```typescript
  shipping_cost: shipping,  // valor do frete calculado (SuperFrete ou estático)
  ```

**2. Edge Function — `supabase/functions/create-payment/index.ts`**
- Atualizar o tipo `PaymentPayload` para aceitar `shipping_cost?: number`
- Na seção de cálculo de frete (linhas 525-548), usar `payload.shipping_cost` quando fornecido, com validação:
  - Se `shipping_cost` for um número >= 0 e <= 500 (limite razoável), usar esse valor
  - Caso contrário, manter o cálculo estático como fallback
  ```typescript
  let shipping = 19.9;
  if (typeof payload.shipping_cost === 'number' && payload.shipping_cost >= 0 && payload.shipping_cost <= 500) {
    shipping = payload.shipping_cost;
  } else if (shippingRules?.length) {
    // ... lógica estática existente
  }
  ```

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Checkout.tsx` | Adicionar `shipping_cost` ao payload |
| `supabase/functions/create-payment/index.ts` | Aceitar e usar `shipping_cost` do payload com validação |

