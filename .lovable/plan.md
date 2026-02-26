

## Gerenciamento de Usuarios nas Configuracoes

### Contexto
- Roles existentes no enum `app_role`: `admin`, `operador`, `financeiro`
- O usuario quer dois perfis: **Super Admin** (admin + financeiro) e **Admin** (operador, sem acesso financeiro)
- Para criar usuarios via admin, precisamos de uma edge function (pois `supabase.auth.admin.createUser` requer service_role_key)

### Mudancas

**1. Edge Function `supabase/functions/create-admin-user/index.ts`**
- Recebe `{ email, password, name, role }` onde role e `"super_admin"` ou `"admin_only"`
- Valida que o chamador e admin (verifica JWT + has_role)
- Usa `createClient` com service_role_key para criar o usuario via `auth.admin.createUser`
- Insere role(s) na tabela `user_roles`:
  - Super Admin → insere role `admin` + `financeiro`
  - Admin → insere role `operador`
- Insere profile na tabela `profiles`

**2. Nova aba "Usuarios" em `src/pages/admin/AdminSettings.tsx`**
- Adicionar tab "Usuarios" com icone `Users`
- Lista usuarios existentes (query `user_roles` + `profiles`)
- Formulario para adicionar usuario: email, senha, nome, tipo (Super Admin / Admin)
- Botao para remover usuario (delete role + nota que o auth user permanece)
- Cada usuario listado mostra nome, email e tipo

**3. Hook `src/hooks/useAdminUsers.ts`**
- Query para listar `user_roles` com join em `profiles`
- Mutation para criar usuario (chama edge function)
- Mutation para remover role

### Mapeamento de roles
- **Super Admin**: roles `admin` + `financeiro` → acesso total incluindo financeiro
- **Admin**: role `operador` → acesso ao painel sem opcoes financeiras

