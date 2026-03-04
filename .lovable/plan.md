

## Integração SuperFrete — Cotação de Frete em Tempo Real

### Contexto atual
O checkout usa regras de frete estáticas da tabela `shipping_rules` (fixo por estado, grátis acima de X). Não há cotação real com transportadoras.

### O que será implementado

**1. Edge Function `calculate-shipping`**
- Recebe: CEP de origem (da loja, configurável), CEP de destino, lista de produtos com peso/dimensões
- Chama `POST https://sandbox.superfrete.com/api/v0/calculator` (ou produção) com Bearer token
- Retorna as opções de frete (PAC, Sedex, Mini Envios, etc.) com preço, prazo e transportadora
- Headers obrigatórios: `Authorization: Bearer {token}`, `User-Agent`, `Content-Type`

**2. Secret do token SuperFrete**
- Armazenar `SUPERFRETE_TOKEN` como secret do Supabase (via tool)
- O admin poderá configurar ambiente (sandbox/produção) na página de Integrações

**3. Campos de peso/dimensões nos produtos**
- Migration: adicionar colunas `weight`, `height`, `width`, `length` na tabela `products` (todos `numeric`, default 0)
- Atualizar o formulário de produto (`ProductForm.tsx`) com esses campos

**4. Config do CEP de origem na página de Integrações**
- Novo card "SuperFrete" em `AdminIntegrations.tsx` com campos: token, ambiente, CEP de origem, serviços habilitados (PAC/Sedex/Mini Envios)
- Salvar em `store_settings` com key `superfrete`

**5. Checkout — seleção de frete dinâmico**
- No step 2 (endereço), após preencher o CEP, chamar a edge function
- Exibir opções de frete retornadas (transportadora, prazo, preço) como radio buttons
- Substituir o cálculo estático atual pelo valor selecionado
- Fallback: se a API falhar, usar as regras estáticas existentes

### Arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/functions/calculate-shipping/index.ts` | Novo — edge function proxy para SuperFrete |
| `supabase/config.toml` | Adicionar `[functions.calculate-shipping]` |
| Migration SQL | Adicionar `weight`, `height`, `width`, `length` em `products` |
| `src/pages/admin/AdminIntegrations.tsx` | Novo card SuperFrete |
| `src/pages/admin/ProductForm.tsx` | Campos peso/dimensões |
| `src/pages/Checkout.tsx` | Cotação dinâmica no step 2, seleção de transportadora |

### Fluxo

```text
Checkout Step 2 (CEP preenchido)
  → fetch edge function calculate-shipping
  → SuperFrete API /api/v0/calculator
  ← retorna [{name: "PAC", price: 18.50, delivery_time: 7}, ...]
  → usuário seleciona opção
  → valor de frete atualizado no resumo
```

### Pré-requisito
O usuário precisará gerar um token na SuperFrete (sandbox ou produção) e adicioná-lo como secret.

