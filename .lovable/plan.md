

## Diagnóstico: Logo salva no banco mas não recarrega

### Causa raiz
O hook `useStoreSettings()` chama `supabase.rpc('get_public_store_settings')`, mas **essa RPC não existe no banco**. Resultado: o tema salvo nunca é carregado de volta, então a logo (e qualquer customização) some ao recarregar a página.

A logo de fato é persistida corretamente no storage e no `store_settings` (confirmei: `store_settings.theme.components.images.logo` tem a URL). O problema é exclusivamente na leitura.

### Solução

Criar a RPC `get_public_store_settings` que retorna todas as settings públicas como um objeto JSON.

**1. Migration SQL** — criar a função `get_public_store_settings`

```sql
CREATE OR REPLACE FUNCTION public.get_public_store_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    jsonb_object_agg(key, value),
    '{}'::jsonb
  )
  FROM store_settings;
$$;
```

Isso faz `supabase.rpc('get_public_store_settings')` retornar `{ "theme": {...}, "brand": {...}, ... }`, que é exatamente o formato esperado por `useStoreSettings` e `ThemeProvider`.

**2. Arquivos impactados**: Nenhum — o código front-end já está correto. Só falta a função no banco.

### Resultado esperado
Após a migration, ao abrir o Editor de Tema:
- Logo e Hero Banner salvos serão carregados corretamente
- Cores, fontes e demais customizações também persistirão entre sessões
- A loja pública também refletirá o tema salvo (ThemeProvider usa o mesmo hook)

