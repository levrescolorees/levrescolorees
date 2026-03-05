

## Corrigir cálculo de frete SuperFrete — campo `services` obrigatório

### Problema

Os logs da edge function `calculate-shipping` mostram erro 400 da API SuperFrete:

```
{"errors":{"services":["(services) é obrigatório."]},"message":"Ocorreu um ou mais erros."}
```

A API SuperFrete exige o campo `services` no body da requisição, indicando quais serviços cotar (ex: `1` para PAC, `2` para SEDEX, `17` para Mini Envios). A edge function atual não envia esse campo.

### Solução

Atualizar `supabase/functions/calculate-shipping/index.ts` para incluir o campo `services` no body da requisição à API SuperFrete. O mapeamento correto dos serviços SuperFrete é:

| Nome | Código |
|------|--------|
| PAC | 1 (ou "1") |
| SEDEX | 2 (ou "2") |
| Mini Envios | 17 (ou "17") |

### Mudança

**`supabase/functions/calculate-shipping/index.ts`**
- Criar um mapeamento de nome de serviço → código numérico
- Converter a lista `enabledServices` (ex: `["PAC", "SEDEX"]`) nos códigos correspondentes
- Adicionar o campo `services` ao body enviado para `POST /api/v0/calculator`

```typescript
const serviceMap: Record<string, string> = {
  "PAC": "1",
  "SEDEX": "2",
  "MINI ENVIOS": "17",
};

const serviceCodes = enabledServices
  .map(s => serviceMap[s.toUpperCase()])
  .filter(Boolean)
  .join(",");

const body = {
  from: { postal_code: originZip.replace(/\D/g, "") },
  to: { postal_code: postal_code_to.replace(/\D/g, "") },
  services: serviceCodes,  // <-- campo obrigatório
  package: { weight, height, width, length },
};
```

Apenas 1 arquivo alterado, apenas a edge function. Nenhuma mudança no frontend.

