

# Pacote Enterprise de Seguranca — Levres Colorees

## Visao Geral

Implementacao das 7 camadas de seguranca para blindar o checkout transparente Mercado Pago, Edge Functions e frontend contra fraude, abuso e manipulacao.

---

## Camada 0 — Regras Gerais

- Criar modulo `_shared/security.ts` (inlined em cada Edge Function) com:
  - `generateRequestId()` — UUID v4 para rastreabilidade
  - `maskEmail(email)` — retorna `j***@g***.com`
  - `maskCPF()` — nunca logar CPF, retornar `***`
  - `constantTimeCompare(a, b)` — comparacao HMAC segura
  - `validateUUID(id)` — regex UUID v4
  - `validateCPF(cpf)` — algoritmo real com digito verificador
  - `sanitizeString(str, maxLen)` — trim + remover chars invisíveis + limitar tamanho
  - `VALID_UFS` — lista oficial AC..TO

Cada Edge Function importa essas funcoes inline (sem subpastas, tudo em index.ts).

---

## Camada 1 — create-payment HARDENING

**Arquivo:** `supabase/functions/create-payment/index.ts`

### Validacoes de entrada
- Rejeitar payload > 50KB via `Content-Length` ou leitura limitada do body
- Validar `Content-Type: application/json`
- Sanitizar e limitar:
  - `name` max 120 chars
  - `email` max 254 chars
  - `street` max 200, `city` max 100, `neighborhood` max 100
  - `number` max 20, `complement` max 100, `zip` exatamente 8 digitos
- Validar `product_id` como UUID valido
- Validar `quantity`: inteiro positivo, min 1, max 100
- Validar `installments`: inteiro entre 1 e `max_installments`
- Validar `state` contra lista de 27 UFs
- Validar `coupon_code`: alfanumerico, max 30 chars
- Validar CPF com algoritmo de digito verificador real

### Rate limiting aprimorado
- IP: max 30 pedidos/minuto (subir de 10)
- Email: max 5 pedidos/hora
- Registrar evento `rate_limit_triggered` em `audit_logs` quando bloqueado

### Idempotencia robusta
- Usar `order.id` como `X-Idempotency-Key` na chamada ao MP (ja existe)
- Adicionar hash do payload normalizado como protecao extra contra double-submit

### Logs estruturados
- Gerar `request_id` no inicio da requisicao
- Todos os `console.log` / `console.error` incluem `request_id`
- Nunca logar CPF, email completo, token, card_token
- Email mascarado nos logs

### Anti-abuso
- Se rate limit for acionado, registrar em `audit_logs` com IP e request_id

---

## Camada 2 — mp-webhook HARDENING + Assinatura

**Arquivo:** `supabase/functions/mp-webhook/index.ts`

### Validacao de assinatura HMAC-SHA256
- Extrair `ts` e `v1` do header `x-signature`
- Rejeitar se `ts` tiver mais de 5 minutos (replay attack)
- Recomputar hash: template `id:{data.id};request-id:{x-request-id};ts:{ts};`
- Computar HMAC-SHA256 com `webhook_secret` da `store_settings`
- Comparar usando `constantTimeCompare`
- Se invalido: registrar `webhook_invalid_signature` em `audit_logs` e retornar 401

### Validacoes pos-assinatura
- Buscar pagamento na API do MP (ja existe)
- Validar `currency_id === 'BRL'`
- Validar `transaction_amount` contra `order.total` (tolerancia de R$ 0.05)
- Validar `external_reference` contra order_id

### Rate limit
- Max 100 chamadas/minuto no webhook

### Logs estruturados com request_id

---

## Camada 3 — payment-status PROTEGIDO

**Arquivo:** `supabase/functions/payment-status/index.ts`

- Rate limit por IP: max 30/minuto
- Validar `order_id` como UUID antes de consultar
- Retornar sempre mesmo formato (nao vazar se pedido existe ou nao)
- Logs estruturados com request_id

---

## Camada 4 — Frontend Security

**Arquivo:** `src/pages/Checkout.tsx`
- Sanitizar inputs antes de enviar (trim, limitar tamanhos)
- Remover qualquer `console.log` de payload/pagamento
- Double-submit ja bloqueado com `submitting` state

**Arquivo:** `index.html`
- Adicionar meta tag CSP restritiva:

```text
default-src 'self';
script-src 'self' 'unsafe-inline' https://sdk.mercadopago.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
connect-src 'self' https://*.supabase.co https://api.mercadopago.com https://viacep.com.br;
frame-src https://*.mercadopago.com;
```

- Adicionar headers de seguranca via meta tags:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## Camada 5 — Tabela audit_logs

### Migracao SQL
Criar tabela `audit_logs`:
- `id` uuid PK default gen_random_uuid()
- `action` text NOT NULL (ex: 'webhook_invalid_signature', 'rate_limit_triggered', 'create_payment_abuse')
- `entity_type` text (ex: 'order', 'webhook', 'payment')
- `entity_id` text
- `user_id` uuid nullable
- `ip_address` text
- `request_id` text
- `details` jsonb (sem dados sensiveis)
- `created_at` timestamptz default now()

### RLS
- Staff pode ler (SELECT)
- INSERT publico (edge functions usam service_role, mas policy permite sistema)
- Nenhum UPDATE/DELETE publico

---

## Camada 6 — AdminIntegrations: Webhook Secret

**Arquivo:** `src/pages/admin/AdminIntegrations.tsx`

- Adicionar campo `webhook_secret` com toggle de visibilidade
- Salvar no `store_settings` junto com as credenciais MP
- Texto instrucional: "Configure este secret no painel do Mercado Pago em Webhooks > Assinatura secreta"

---

## Camada 7 — Seguranca Extra

- Mass assignment: `create-payment` ja usa campos explicitos (nao faz spread do body)
- RLS e RBAC ja existentes continuam intactos
- Headers de seguranca adicionados no index.html (camada 4)

---

## Secao Tecnica

### Arquivos modificados

```text
supabase/functions/create-payment/index.ts  -- hardening completo (validacoes, rate limit, CPF, logs)
supabase/functions/mp-webhook/index.ts       -- assinatura HMAC, validacoes extras, audit_logs
supabase/functions/payment-status/index.ts   -- rate limit, UUID validation
src/pages/admin/AdminIntegrations.tsx        -- campo webhook_secret
src/pages/Checkout.tsx                       -- sanitizacao de inputs
index.html                                   -- CSP + security headers
```

### Migracao SQL

```text
CREATE TABLE audit_logs (...)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY
CREATE POLICY ... (staff SELECT, public INSERT)
```

### Funcoes de seguranca (inline em cada Edge Function)

```text
generateRequestId()     -- crypto.randomUUID()
maskEmail(email)        -- j***@g***.com
constantTimeCompare()   -- HMAC-based comparison
validateUUID(id)        -- regex /^[0-9a-f]{8}-...-[0-9a-f]{12}$/
validateCPF(cpf)        -- algoritmo digito verificador real
sanitizeString(s, max)  -- trim + strip control chars + slice
VALID_UFS               -- Set com 27 UFs brasileiras
```

### Algoritmo de validacao de CPF

```text
1. Remover nao-digitos, verificar 11 digitos
2. Rejeitar sequencias repetidas (111.111.111-11, etc.)
3. Calcular 1o digito verificador com pesos 10..2
4. Calcular 2o digito verificador com pesos 11..2
5. Comparar com digitos informados
```

### Validacao de assinatura webhook MP

```text
1. Extrair ts e v1 do header x-signature
2. Se ts > 5 min atras: rejeitar (replay)
3. Template: "id:{body.data.id};request-id:{x-request-id};ts:{ts};"
4. HMAC-SHA256(webhook_secret, template)
5. Comparar v1 com hash usando constantTimeCompare
6. Se falhar: audit_log + 401
```

### Ordem de execucao

1. Criar tabela `audit_logs` via migracao
2. Atualizar `create-payment` com todas as validacoes
3. Atualizar `mp-webhook` com assinatura HMAC + validacoes
4. Atualizar `payment-status` com rate limit + UUID
5. Atualizar `AdminIntegrations` com campo webhook_secret
6. Sanitizar inputs no `Checkout.tsx`
7. Adicionar CSP + headers no `index.html`
8. Deploy das 3 edge functions

