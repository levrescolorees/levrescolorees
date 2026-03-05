

## Correção: Edge function `create-payment` não foi redeployada

### Problema

Os logs mostram:
```
"error":"payload contem campos nao permitidos"
```

O checkout agora envia `shipping_cost` e `shipping_method` no payload, mas a versão **deployada** da edge function `create-payment` ainda não reconhece esses campos. O código foi editado corretamente, mas precisa ser redeployado.

### Solução

Redeployar a edge function `create-payment` para que a versão com os campos `shipping_cost` e `shipping_method` na lista de campos permitidos entre em vigor.

Nenhuma alteração de código é necessária — apenas redeploy da função existente.

### Arquivos

| Ação | Detalhe |
|------|---------|
| Redeploy | `supabase/functions/create-payment/index.ts` |

