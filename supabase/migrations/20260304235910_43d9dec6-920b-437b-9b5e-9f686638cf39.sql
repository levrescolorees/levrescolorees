
CREATE OR REPLACE FUNCTION public.get_public_store_settings()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    jsonb_object_agg(
      key,
      CASE
        WHEN key = 'superfrete' THEN value - 'token'
        WHEN key = 'mercado_pago' THEN value - 'access_token'
        ELSE value
      END
    ),
    '{}'::jsonb
  )
  FROM store_settings;
$$;
