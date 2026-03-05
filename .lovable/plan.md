

## Correção: Tabela `checkout_idempotency` não existe

### Problema

Os logs mostram claramente:

```
Could not find the table 'public.checkout_idempotency' in the schema cache
```

A edge function `create-payment` referencia a tabela `checkout_idempotency` para controle de idempotência (evitar pagamentos duplicados), mas essa tabela nunca foi criada no banco.

### Solução

Criar a tabela `checkout_idempotency` via migration SQL com as colunas que a edge function espera:

```sql
CREATE TABLE public.checkout_idempotency (
  idempotency_key text PRIMARY KEY,
  request_fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  response_payload jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_idempotency ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy de SELECT/UPDATE/DELETE para anon — apenas a service_role (usada pela edge function) acessa
```

Nenhuma RLS policy pública é necessária pois a edge function usa `SUPABASE_SERVICE_ROLE_KEY` que bypassa RLS.

### Arquivos

| Mudança | Detalhe |
|---------|---------|
| Migration SQL | Criar tabela `checkout_idempotency` |

Nenhuma alteração de código — apenas criação da tabela que já é referenciada.

