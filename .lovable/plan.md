## Objetivo

Permitir que o cliente monte o carrinho normalmente e finalize enviando o pedido completo por WhatsApp, para um número configurado no painel admin. O checkout com pagamento online continua funcionando (WhatsApp é opção adicional).

## O que será feito

### 1. Configuração no admin
Nova aba **WhatsApp** em Configurações com:
- Número do WhatsApp (com DDI/DDD, ex: 5511999999999)
- Liga/desliga o botão de pedido por WhatsApp
- Texto de saudação opcional no início da mensagem

Salvo em `store_settings` na chave `whatsapp` (já é lida publicamente pela função `get_public_store_settings`, sem expor segredos).

### 2. Botão no carrinho e no checkout
- **Carrinho / gaveta do carrinho**: botão secundário "Pedir pelo WhatsApp" abaixo de "Finalizar Compra". Ele leva o cliente ao checkout já em modo WhatsApp (para preencher os dados).
- **Checkout**: na etapa final, além de "Pagar agora", aparece "Enviar pedido pelo WhatsApp". Usa os mesmos dados já preenchidos (cliente, endereço, frete, cupom) — sem passar pelo Mercado Pago.
- O botão só aparece se o número estiver configurado e a opção estiver ativa.

### 3. Mensagem formatada
Ao clicar, abre o WhatsApp (`wa.me`) com a mensagem pronta, organizada assim:

```text
*NOVO PEDIDO - Lèvres Colorées*

*CLIENTE*
Nome: Maria Silva
Telefone: (11) 98888-7777
E-mail: maria@email.com
CPF: 000.000.000-00
(CNPJ / Empresa quando for revendedora)

*ENTREGA*
Rua Exemplo, 123 - Apto 12
Bairro - Cidade/SP
CEP: 01234-567
Frete: PAC - R$ 19,90 (5 dias úteis)

*ITENS*
1) Base BT Skin
   Cor: F10 Fair
   Qtd: 3 x R$ 13,99 = *R$ 41,97*

2) Pó Solto Glass
   Cor: GPT04
   Qtd: 1 x R$ 6,99 = *R$ 6,99*

*RESUMO*
Total de itens: 4
Subtotal: R$ 48,96
Desconto (CUPOM10): -R$ 4,90
Frete: R$ 19,90
*TOTAL: R$ 63,96*

Observações: entregar após as 14h
Pedido gerado pelo site em 29/07/2026 00:15
```

Regras de formatação:
- Cada item numerado, com variação/cor, quantidade, valor unitário e subtotal (quantidade > 1 já vem somada).
- Preço unitário respeita a precificação por quantidade (Box 06 / Box 12) já usada no carrinho.
- Total de itens = soma das quantidades.
- Campos vazios são omitidos (ex.: sem cupom, sem observação).

### 4. Campo de observações
Campo livre "Observações do pedido" no checkout, incluído na mensagem.

### 5. Registro do pedido
O pedido também é gravado no banco com `payment_method = 'whatsapp'` e status `pendente`, para aparecer no admin em Pedidos — assim você tem o histórico mesmo fechando pelo WhatsApp.

## Detalhes técnicos

- `src/lib/whatsappOrder.ts`: função pura que monta o texto a partir de itens + dados do checkout, com `encodeURIComponent` e quebras de linha `%0A`. Testável isoladamente.
- `useStoreSettings`: novo tipo `WhatsAppSettings { number, enabled, greeting }`.
- `AdminSettings.tsx`: nova aba usando o mutation `saveSetting` existente (chave `whatsapp`), com máscara/validação do número (só dígitos, 12-13 caracteres).
- `Checkout.tsx`: novo handler `handleWhatsAppOrder` que reaproveita a criação de pedido já existente (`useCreateOrder`) e, no sucesso, abre `https://wa.me/<numero>?text=<mensagem>` em nova aba e limpa o carrinho.
- `CartDrawer.tsx` e `Cart.tsx`: botão secundário navegando para `/checkout?modo=whatsapp`.
- Sem migração de banco: `store_settings` e `orders.payment_method` (texto) já suportam.
