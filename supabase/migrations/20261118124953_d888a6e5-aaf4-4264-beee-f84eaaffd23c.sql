CREATE POLICY "Vendedor can insert products" ON public.products FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['vendedor']::app_role[]));