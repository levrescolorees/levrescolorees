

## Adicionar campo de Token no painel SuperFrete

### Problema
Hoje o token da SuperFrete é armazenado como secret do Supabase (`SUPERFRETE_TOKEN`), sem possibilidade de alteração pelo admin. O usuário quer autonomia total para trocar o token direto no painel.

### Solução
Armazenar o token no campo `value` da tabela `store_settings` (key: `superfrete`) junto com as outras configs, e atualizar a edge function para ler o token de lá em vez de `Deno.env.get("SUPERFRETE_TOKEN")`.

### Mudanças

**1. `src/pages/admin/AdminIntegrationSuperFrete.tsx`**
- Adicionar estado `sfToken` e campo de input tipo password com botão de mostrar/ocultar
- Salvar o token junto com as demais configurações no `store_settings`
- Remover o texto "entre em contato com o suporte"
- Mostrar indicador visual se o token está preenchido ou não

**2. `supabase/functions/calculate-shipping/index.ts`**
- Ler o token de `settings.token` (vindo do `store_settings`) em vez de `Deno.env.get("SUPERFRETE_TOKEN")`
- Manter fallback para o secret caso `settings.token` não exista (retrocompatibilidade)

### Segurança
- O token fica na tabela `store_settings` que só admins podem escrever (RLS já garante isso)
- A leitura pública via `get_public_store_settings` expõe todos os settings — porém a edge function usa `SERVICE_ROLE_KEY`, então o token não precisa ser exposto no frontend
- No frontend, o token será mascarado (input type password) e só enviado na mutation de save

### Nota sobre `get_public_store_settings`
A function RPC `get_public_store_settings` retorna TODOS os settings publicamente. Isso significa que o token ficaria exposto via essa RPC. Para evitar isso, vou atualizar a function para excluir campos sensíveis, ou armazenar o token em uma key separada (`superfrete_token`) que a RPC filtra.

**Abordagem escolhida**: Salvar o token dentro do JSON de `superfrete` mas atualizar a RPC `get_public_store_settings` para remover o campo `token` do JSON antes de retornar.

**3. Migration SQL**
- Atualizar a function `get_public_store_settings` para sanitizar o campo `token` do setting `superfrete` antes de retornar

