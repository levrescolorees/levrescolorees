

## Validação de CPF e CNPJ no Checkout

### O que existe hoje
- Step 1 valida apenas que o CPF tem 11 dígitos (`form.cpf.replace(/\D/g, '').length === 11`) — sem verificação dos dígitos verificadores
- CNPJ não tem nenhuma validação (apenas máscara)
- Nenhum feedback visual de erro inline

### O que será implementado

**1. Funções de validação** — criar `src/lib/validators.ts`
- `isValidCPF(cpf: string): boolean` — algoritmo dos 2 dígitos verificadores (módulo 11), rejeita sequências repetidas (111.111.111-11, etc.)
- `isValidCNPJ(cnpj: string): boolean` — algoritmo dos 2 dígitos verificadores (módulo 11), rejeita sequências repetidas

**2. Atualizar `Checkout.tsx`**
- Importar as funções de validação
- Alterar `isStep1Valid` para chamar `isValidCPF()` em vez de apenas checar `.length === 11`
- Se `form.isWholesale`, exigir também `isValidCNPJ(form.cnpj)`
- Adicionar estado `touched` para CPF e CNPJ (marca como tocado no `onBlur`)
- Exibir mensagem de erro inline vermelha abaixo do campo quando tocado e inválido: "CPF inválido" / "CNPJ inválido"
- Manter as máscaras existentes intactas

**3. Arquivos**

| Arquivo | Mudança |
|---|---|
| `src/lib/validators.ts` | Novo — `isValidCPF`, `isValidCNPJ` |
| `src/pages/Checkout.tsx` | Importar validadores, atualizar `isStep1Valid`, adicionar feedback inline |

