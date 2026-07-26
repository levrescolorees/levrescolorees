
-- 1. Drop overly permissive policies on order-related tables
DROP POLICY IF EXISTS "Public can insert customers at checkout" ON public.customers;
DROP POLICY IF EXISTS "Public can insert orders at checkout" ON public.orders;
DROP POLICY IF EXISTS "Public can view own order" ON public.orders;
DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can insert initial status" ON public.order_status_history;

-- 2. Restrict profiles SELECT to owner or staff
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- 3. Restrict store_settings SELECT to staff (public reads happen via get_public_store_settings RPC)
DROP POLICY IF EXISTS "Store settings are publicly readable" ON public.store_settings;
CREATE POLICY "Staff can view store settings"
  ON public.store_settings FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- 4. Restrict storage bucket listing (public URL access still works without SELECT)
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Theme assets are publicly accessible" ON storage.objects;

CREATE POLICY "Staff can list product images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin_or_operador(auth.uid()));

CREATE POLICY "Admin can list theme assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'theme-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Revoke EXECUTE on SECURITY DEFINER helpers not meant for direct client calls
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_operador(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email_on_order_status() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email_on_tracking() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email_on_payment_approved() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email_on_order_created() FROM anon, authenticated, PUBLIC;

-- Restrict admin_products_list to signed-in staff only
REVOKE EXECUTE ON FUNCTION public.admin_products_list(text, uuid, integer, integer) FROM anon, PUBLIC;

-- get_public_store_settings must stay callable by anon/authenticated (sanitized RPC)
GRANT EXECUTE ON FUNCTION public.get_public_store_settings() TO anon, authenticated;
