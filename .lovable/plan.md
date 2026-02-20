

# Corrigir Integração Mercado Pago: Public Key + Access Token

## Problema

1. A tela de Integrações pede apenas o **Access Token**, mas o Checkout Transparente exige tambem a **Public Key** (para o SDK do frontend tokenizar cartoes).
2. O edge function `create-payment` le o token de variavel de ambiente (`Deno.env.get`), mas as credenciais sao salvas na tabela `store_settings`. Resultado: o gateway nunca esta "configurado" e o pedido fica em "Aguardando Pagamento" sem processar.
3. O frontend do checkout nao carrega o SDK do Mercado Pago com a Public Key.

## Solucao

### 1. AdminIntegrations.tsx — Adicionar campo Public Key

- Adicionar estado `mpPublicKey` e campo de input para a **Public Key** (formato `APP_USR-...` ou `TEST-...`)
- Salvar no `store_settings` junto com o access_token:
  ```
  value: {
    public_key: mpPublicKey,
    access_token: mpAccessToken,
    environment, enabled, pix_enabled, card_enabled, boleto_enabled, max_installments
  }
  ```
- Adicionar toggle de visibilidade para a Public Key tambem
- Atualizar o `useEffect` para carregar `mp.public_key`

### 2. Edge Function create-payment — Ler token do banco

Modificar `supabase/functions/create-payment/index.ts`:
- Em vez de `Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')`, buscar da tabela `store_settings` onde `key = 'mercado_pago'`
- Extrair `value.access_token` do registro
- Verificar se `value.enabled === true` antes de processar
- Fallback: se nao encontrar no banco, tentar `Deno.env.get` como backup

### 3. Edge Function mp-webhook — Ler token do banco

Modificar `supabase/functions/mp-webhook/index.ts`:
- Mesmo ajuste: buscar access_token de `store_settings` em vez de env var
- Manter fallback para env var

### 4. Checkout.tsx — Carregar SDK com Public Key

Modificar `src/pages/Checkout.tsx`:
- Buscar a `public_key` da `store_settings` via `useStoreSettings()`
- No step de pagamento por cartao, carregar o SDK do Mercado Pago (`https://sdk.mercadopago.com/js/v2`) dinamicamente
- Inicializar `new MercadoPago(publicKey)` e criar card form/tokenizacao
- Usar o token gerado no `handleSubmit`

## Secao Tecnica

### Arquivos modificados

```text
src/pages/admin/AdminIntegrations.tsx  -- adicionar campo public_key
supabase/functions/create-payment/index.ts  -- ler token do store_settings
supabase/functions/mp-webhook/index.ts  -- ler token do store_settings
src/pages/Checkout.tsx  -- carregar SDK MP com public_key
```

### Fluxo corrigido

```text
Admin salva Public Key + Access Token em store_settings
                    |
Frontend (Checkout) le Public Key do store_settings
                    |
SDK MP inicializa com Public Key -> tokeniza cartao
                    |
create-payment le Access Token do store_settings -> chama MP API
                    |
mp-webhook le Access Token do store_settings -> valida pagamento
```

### Ordem de execucao

1. Atualizar AdminIntegrations com campo Public Key
2. Atualizar create-payment para ler credenciais do banco
3. Atualizar mp-webhook para ler credenciais do banco
4. Atualizar Checkout.tsx para carregar SDK MP com Public Key
5. Deploy das edge functions

