

## Gerar Etiqueta Automaticamente Após Pagamento Aprovado

Atualmente o botão "Gerar Etiqueta" no admin é manual. A solução é adicionar a geração automática no webhook do Mercado Pago (`mp-webhook`), logo após o pagamento ser aprovado e o pedido mudar para status `confirmado`.

### Mudança

**`supabase/functions/mp-webhook/index.ts`** (linhas ~284-294)

Após o webhook atualizar o pedido para `confirmado`, chamar a edge function `generate-shipping-label` internamente (fetch para a própria Supabase):

```typescript
// After updating order to 'confirmado', auto-generate shipping label
if (mapped.order === 'confirmado') {
  try {
    const labelRes = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-shipping-label`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ order_id: orderId }),
      }
    );
    const labelData = await labelRes.json();
    slog(rid, 'info', 'Auto label generation', { 
      order_id: orderId, 
      success: labelRes.ok,
      tracking: labelData?.label?.tracking_code 
    });
  } catch (labelErr) {
    slog(rid, 'warn', 'Auto label generation failed', { 
      order_id: orderId, 
      error: String(labelErr) 
    });
    // Non-blocking: label can still be generated manually
  }
}
```

O botão manual no admin continuara funcionando como fallback caso a geração automática falhe (ex: saldo insuficiente na SuperFrete, dados incompletos).

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/mp-webhook/index.ts` | Adicionar chamada automática para `generate-shipping-label` após pagamento aprovado |

