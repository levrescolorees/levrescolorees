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