
-- Create theme-assets bucket (public so images can be displayed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('theme-assets', 'theme-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view theme assets (public bucket)
CREATE POLICY "Theme assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'theme-assets');

-- Admin can upload theme assets
CREATE POLICY "Admin can upload theme assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'theme-assets'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Admin can update theme assets
CREATE POLICY "Admin can update theme assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'theme-assets'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Admin can delete theme assets
CREATE POLICY "Admin can delete theme assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'theme-assets'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
