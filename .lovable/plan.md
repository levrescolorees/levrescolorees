

# Checkout Enterprise com Mercado Pago (Plano Ajustado)

Implementacao em 3 fases com os 3 ajustes criticos incorporados: seguranca no create-payment, separacao status logistico vs financeiro, e validacao de webhook.

---

## FASE 1 -- Infraestrutura e Backend

### 1.1 Migracao no Banco

Adicionar 3 colunas na tabela `orders`:

- `payment_status` TEXT NOT NULL DEFAULT 'pending' (pending, approved, rejected, cancelled, refunded)
- `payment_id` TEXT (ID externo do Mercado Pago)
- `payment_details` JSONB (snapshot da resposta do gateway)

Separacao clara:
- `orders.status` = logistica (pendente, confirmado, preparando, enviado, entregue, cancelado) -- ja existe
- `orders.payment_status` = financeiro (pending, approved, rejected, cancelled, refunded) -- novo

### 1.2 Secret Mercado Pago

Solicitar ao usuario e configurar como secret do Supabase:
- `MERCADO_PAGO_ACCESS_TOKEN` (sandbox ou producao)

### 1.3 Edge Function: create-payment (POST)

Arquivo: `supabase/functions/create-payment/index.ts`

**Seguranca (Ajuste Critico 1):** Esta funcao NAO sera totalmente publica. Configurar `verify_jwt = false` no config.toml mas implementar protecoes no codigo:
- Validacao forte de todos os campos de entrada com checagem de tipos e limites
- Rate limiting basico por IP (header x-forwarded-for) -- rejeitar se mais de 10 tentativas em 1 minuto do mesmo IP
- Validacao de email formato valido
- Rejeitar payloads duplicados (mesmo email + mesmos items + mesmo total em janela de 5 minutos)

Entrada esperada:
- items (array com product_id, variant_id, quantity)
- customer (name, email, phone, cpf, cnpj, company_name, is_reseller)
- shipping_address
- payment_method (pix, card, boleto)
- coupon_code (opcional)
- card_token (obrigatorio se payment_method=card)

Processo:
1. Validar items contra DB: preco correto, estoque suficiente, variantes validas
2. Recalcular total no servidor (NUNCA confiar no frontend)
3. Aplicar regras de preco por quantidade (price_rules) no servidor
4. Validar cupom no servidor: ativo, validade, limite de uso, valor minimo
5. Find or create customer por email
6. Criar order: status='pendente', payment_status='pending'
7. Criar order_items com snapshot (preco unitario aplicado)
8. Chamar Mercado Pago Payments API:
   - PIX: retornar qr_code, qr_code_base64, ticket_url
   - Cartao: receber card_token, criar payment com token
   - Boleto: retornar barcode, external_resource_url
9. Atualizar order com payment_id e payment_details
10. Retornar: order_id, order_number, payment_status, dados do metodo

### 1.4 Edge Function: mp-webhook (POST, publico)

Arquivo: `supabase/functions/mp-webhook/index.ts`

Config: `verify_jwt = false` (publico, chamado pelo Mercado Pago)

**Validacao de Webhook (Ajuste Critico 3):**
1. Receber notificacao do MP (tipo payment)
2. SEMPRE buscar detalhes do pagamento via API do MP (nunca confiar no payload do webhook)
3. Validar: conferir amount e currency batem com o pedido no banco
4. Conferir external_reference ou metadata bate com o order_id
5. So entao atualizar no banco

**Mapeamento de Status (Ajuste Critico 2):**
- `approved` -> payment_status='approved', orders.status='confirmado'
- `rejected` -> payment_status='rejected', orders.status='cancelado'
- `cancelled` -> payment_status='cancelled', orders.status='cancelado'
- `refunded` -> payment_status='refunded', orders.status='cancelado'
- `pending` -> payment_status='pending', orders.status nao muda (continua 'pendente')
- `in_process` -> payment_status='pending', orders.status nao muda

6. Inserir em order_status_history com nota descritiva

### 1.5 Edge Function: payment-status (GET, publico)

Arquivo: `supabase/functions/payment-status/index.ts`

Config: `verify_jwt = false`

Entrada: order_id (query param)
Retorna APENAS:
- payment_status
- order_status
- payment_method

Nao retorna dados sensiveis (email, endereco, valores detalhados).

### 1.6 Config TOML

```text
[functions.create-payment]
verify_jwt = false

[functions.mp-webhook]
verify_jwt = false

[functions.payment-status]
verify_jwt = false
```

create-payment com verify_jwt=false mas com protecoes em codigo (rate limit, validacao forte, anti-duplicata).

---

## FASE 2 -- Frontend do Checkout (Alta Conversao)

### 2.1 Reescrever Checkout.tsx

Layout enterprise 2 colunas com 4 steps e barra de progresso.

**Coluna esquerda (form em 4 steps):**

Step 1 - Identificacao:
- Nome, email, phone, CPF
- Toggle CNPJ/revenda
- Mascaras: CPF (xxx.xxx.xxx-xx), telefone ((xx) xxxxx-xxxx)

Step 2 - Endereco:
- CEP com busca ViaCEP automatica (ao digitar 8 digitos)
- Auto-preencher rua, bairro, cidade, estado
- Loading state e erro amigavel se CEP invalido
- Campos: rua, numero, complemento, bairro, cidade, estado

Step 3 - Entrega:
- Resumo do frete calculado (usa shippingRules existentes)
- Mostrar regra aplicada (gratis acima de X, por estado, fixo)

Step 4 - Pagamento:
- Selecao: Pix (5% off) | Cartao (ate 12x) | Boleto (3 dias uteis)
- Se cartao: campos tokenizados via SDK Mercado Pago
- Se pix/boleto: apenas selecionar e prosseguir

Barra de progresso visual no topo (4 steps com icones).

**Coluna direita (sticky):**
- Itens com thumbnail de imagem
- Economia gerada (preco varejo vs smart price)
- Campo cupom com validacao
- Subtotal, frete, desconto cupom, desconto pix
- Se cartao: parcelamento dinamico (1x-12x)
- Total final
- CTA: "Finalizar Compra com Seguranca"
- Selos: SSL, Mercado Pago, Garantia 30 dias

**Mobile:**
- Resumo colapsavel no topo
- Botao fixo inferior "Finalizar -- R$ XX,XX"

### 2.2 Fluxo Pix

Ao submeter:
1. Chamar create-payment com method=pix via supabase.functions.invoke
2. Exibir tela de pagamento Pix:
   - QR Code (imagem base64 do MP)
   - Codigo copia-e-cola com botao "Copiar"
   - Contador regressivo 30 minutos
   - Botao "Ja paguei" (forca polling imediato)
3. Polling em payment-status a cada 5 segundos
4. Ao detectar approved: tela de sucesso + link para rastreio

### 2.3 Fluxo Cartao (Checkout Transparente)

1. Carregar SDK Mercado Pago via script tag (MercadoPago.js)
2. Campos do cartao: numero, nome, validade, CVV
3. Selecao de parcelas (1x-12x com juros)
4. Tokenizar cartao no frontend (dados nunca chegam ao backend)
5. Enviar token para create-payment com method=card
6. Resposta imediata: approved ou rejected
7. Se aprovado: tela de sucesso
8. Se rejeitado: mensagem amigavel, permitir retentar

### 2.4 Fluxo Boleto

1. Chamar create-payment com method=boleto
2. Exibir:
   - Linha digitavel com botao "Copiar"
   - Link para PDF do boleto (external_resource_url)
   - Info de vencimento (3 dias uteis)
3. Polling leve para status (boleto pode demorar dias)

### 2.5 ViaCEP

No campo CEP:
- Ao atingir 8 digitos, fetch `https://viacep.com.br/ws/{cep}/json/`
- Auto-preencher rua (logradouro), bairro, cidade (localidade), estado (uf)
- Loading spinner enquanto busca
- Toast de erro se CEP nao encontrado

---

## FASE 3 -- Conversao e Polish

### 3.1 Elementos de Conversao

- Barra de progresso 4 steps (Dados > Endereco > Entrega > Pagamento)
- Selos de seguranca: icone cadeado SSL, logo Mercado Pago, "Garantia 30 dias"
- Indicador de economia total (quanto economizou vs varejo)
- Micro-animacoes com framer-motion nas transicoes de step
- Loading states elegantes em todos os botoes

### 3.2 Validacao

- Zod schema para cada step do checkout
- Validacao inline com mensagens de erro por campo
- Mascaras para CPF, CNPJ, telefone, CEP
- Desabilitar botao submit ate form valido
- Prevenir duplo-click no submit (loading state + disable)

### 3.3 Parcelamento Dinamico

Tabela de parcelas ao selecionar cartao:
- 1x sem juros
- 2x-6x com juros de 2.99%
- 7x-12x com juros de 3.49%
- Atualizar total conforme parcela selecionada
- Exibir "ou 12x de R$ XX,XX" no resumo

---

## Secao Tecnica

### Arquivos Criados/Modificados

```text
supabase/functions/create-payment/index.ts    -- edge function: criar pedido + pagamento MP
supabase/functions/mp-webhook/index.ts        -- edge function: webhook do Mercado Pago
supabase/functions/payment-status/index.ts    -- edge function: polling de status
supabase/config.toml                          -- verify_jwt=false para as 3 functions
src/pages/Checkout.tsx                        -- reescrever checkout completo
src/hooks/useOrders.ts                        -- adicionar payment_status, payment_id, payment_details
```

### Fluxo de Dados

```text
Frontend                    create-payment               Mercado Pago
   |                            |                            |
   |-- invoke create-payment -->|                            |
   |                            |-- valida items/estoque     |
   |                            |-- recalcula total          |
   |                            |-- valida cupom             |
   |                            |-- cria customer            |
   |                            |-- cria order (pendente)    |
   |                            |-- POST /v1/payments ------>|
   |                            |<--- payment response ------|
   |                            |-- salva payment_id         |
   |<--- order_id + QR/token ---|                            |
   |                            |                            |
   |-- invoke payment-status -->|                            |
   |<--- status (approved?) ----|                            |
   |                            |                            |
   |                            |<--- POST mp-webhook ------|
   |                            |-- busca payment via API -->|
   |                            |<--- payment details -------|
   |                            |-- valida amount/ref        |
   |                            |-- atualiza order           |
```

### Ordem de Execucao

1. Solicitar secret MERCADO_PAGO_ACCESS_TOKEN
2. Migracao SQL (payment_status, payment_id, payment_details)
3. Atualizar DBOrder interface em useOrders.ts
4. Criar edge function create-payment
5. Criar edge function mp-webhook
6. Criar edge function payment-status
7. Atualizar config.toml
8. Reescrever Checkout.tsx com layout enterprise + steps + validacao
9. Integrar ViaCEP
10. Integrar SDK Mercado Pago (tokenizacao cartao)
11. Implementar fluxo Pix (QR + polling)
12. Implementar fluxo Cartao (token + resposta)
13. Implementar fluxo Boleto
14. Adicionar mascaras + validacao zod
15. Adicionar elementos de conversao e polish

### Dependencia Critica

Antes de iniciar, o usuario precisa fornecer o MERCADO_PAGO_ACCESS_TOKEN (obtido em https://www.mercadopago.com.br/developers/panel/app). Pode ser token de sandbox para desenvolvimento.

### Confirmacao Tecnica

Sim, sera usado Mercado Pago em modo Checkout Transparente (Payments API v1), com tokenizacao de cartao no frontend e criacao de pagamento no backend. Nao sera usado Checkout Pro (redirect).

