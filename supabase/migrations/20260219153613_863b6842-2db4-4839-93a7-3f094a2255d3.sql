
ALTER TABLE products
  ADD COLUMN status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN published_at TIMESTAMPTZ,
  ADD COLUMN seo_title TEXT NOT NULL DEFAULT '',
  ADD COLUMN meta_description TEXT NOT NULL DEFAULT '';

UPDATE products SET status = 'published', published_at = now() WHERE is_active = true;
UPDATE products SET status = 'draft' WHERE is_active = false;
