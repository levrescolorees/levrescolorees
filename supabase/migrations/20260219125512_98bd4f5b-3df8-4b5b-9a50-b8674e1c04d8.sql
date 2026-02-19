
-- Seed collections
INSERT INTO public.collections (name, slug, description, sort_order) VALUES
  ('Mais Vendidos', 'bestsellers', 'Os favoritos das nossas clientes', 1),
  ('Novidades', 'novidades', 'Acabaram de chegar', 2),
  ('Box 06', 'box06', 'Kits com 6 unidades - ideal para começar a revender', 3),
  ('Box 12', 'box12', 'Kits com 12 unidades - melhor custo-benefício', 4);

-- Seed products
INSERT INTO public.products (name, slug, sku, short_description, description, retail_price, rating, reviews_count, is_active, stock, badge, ideal_for_resale, suggested_margin) VALUES
  ('Gloss Velvet Rose', 'gloss-velvet-rose', 'GVR-001', 'Gloss aveludado de alta pigmentação', 'Gloss labial de alta pigmentação com acabamento aveludado. Fórmula hidratante enriquecida com vitamina E e óleo de jojoba. Longa duração de até 8 horas sem transferência. Perfeito para uso diário e ocasiões especiais.', 39.90, 4.8, 247, true, 100, 'Mais Vendido', true, 60),
  ('Lip Tint Aquarelle', 'lip-tint-aquarelle', 'LTA-001', 'Lip tint aquarelado de longa duração', 'Lip tint de longa duração com efeito aquarelado natural. Textura leve e não resseca os lábios. Cor buildable - aplique mais camadas para intensificar. Fórmula vegana e cruelty-free.', 34.90, 4.7, 189, true, 100, 'Mais Vendido', true, 55),
  ('Batom Matte Luxe', 'batom-matte-luxe', 'BML-001', 'Batom matte confortável e duradouro', 'Batom matte com cobertura total e conforto absoluto. Não craquela, não resseca. Acabamento ultra matte sofisticado. Embalagem premium em rose gold.', 44.90, 4.9, 56, true, 100, 'Novo', true, 65),
  ('Lip Oil Glow', 'lip-oil-glow', 'LOG-001', 'Óleo labial nutritivo com brilho intenso', 'Óleo labial nutritivo com brilho intenso e natural. Enriquecido com óleos essenciais de rosa mosqueta e argan. Hidratação profunda com acabamento glossy. Aroma delicado de rosas.', 42.90, 4.6, 34, true, 100, 'Novo', true, 58),
  ('Lip Liner Précision', 'lip-liner-precision', 'LLP-001', 'Lápis labial de precisão perfeita', 'Lápis delineador labial de precisão milimétrica. Ponta fina para contorno perfeito. Textura cremosa que não puxa. Longa duração à prova d''água.', 29.90, 4.5, 123, true, 100, NULL, true, 50),
  ('Gloss Plumper Volume', 'gloss-plumper-volume', 'GPV-001', 'Gloss volumizador com efeito espelhado', 'Gloss com efeito plumper que aumenta o volume dos lábios instantaneamente. Sensação refrescante de menta. Efeito espelhado ultra brilhante. Ingredientes hidratantes de ácido hialurônico.', 49.90, 4.8, 78, true, 100, 'Novo', true, 62);

-- Seed price_rules (box06 and box12 prices for each product)
INSERT INTO public.price_rules (product_id, min_quantity, price, label) 
SELECT id, 6, 29.90, 'Box 06' FROM public.products WHERE slug = 'gloss-velvet-rose'
UNION ALL SELECT id, 12, 24.90, 'Box 12' FROM public.products WHERE slug = 'gloss-velvet-rose'
UNION ALL SELECT id, 6, 26.90, 'Box 06' FROM public.products WHERE slug = 'lip-tint-aquarelle'
UNION ALL SELECT id, 12, 21.90, 'Box 12' FROM public.products WHERE slug = 'lip-tint-aquarelle'
UNION ALL SELECT id, 6, 34.90, 'Box 06' FROM public.products WHERE slug = 'batom-matte-luxe'
UNION ALL SELECT id, 12, 28.90, 'Box 12' FROM public.products WHERE slug = 'batom-matte-luxe'
UNION ALL SELECT id, 6, 32.90, 'Box 06' FROM public.products WHERE slug = 'lip-oil-glow'
UNION ALL SELECT id, 12, 27.90, 'Box 12' FROM public.products WHERE slug = 'lip-oil-glow'
UNION ALL SELECT id, 6, 22.90, 'Box 06' FROM public.products WHERE slug = 'lip-liner-precision'
UNION ALL SELECT id, 12, 18.90, 'Box 12' FROM public.products WHERE slug = 'lip-liner-precision'
UNION ALL SELECT id, 6, 38.90, 'Box 06' FROM public.products WHERE slug = 'gloss-plumper-volume'
UNION ALL SELECT id, 12, 32.90, 'Box 12' FROM public.products WHERE slug = 'gloss-plumper-volume';

-- Seed product_variants (colors for each product)
INSERT INTO public.product_variants (product_id, name, sort_order)
SELECT id, unnest(ARRAY['Rosa Nude', 'Rosé', 'Berry', 'Mauve', 'Coral', 'Wine']), generate_series(1,6) FROM public.products WHERE slug = 'gloss-velvet-rose';

INSERT INTO public.product_variants (product_id, name, sort_order)
SELECT id, unnest(ARRAY['Cereja', 'Framboesa', 'Pêssego', 'Ameixa']), generate_series(1,4) FROM public.products WHERE slug = 'lip-tint-aquarelle';

INSERT INTO public.product_variants (product_id, name, sort_order)
SELECT id, unnest(ARRAY['Nude Rosé', 'Terracota', 'Vinho', 'Burgundy', 'Caramelo']), generate_series(1,5) FROM public.products WHERE slug = 'batom-matte-luxe';

INSERT INTO public.product_variants (product_id, name, sort_order)
SELECT id, unnest(ARRAY['Honey', 'Cherry', 'Rosewood', 'Crystal']), generate_series(1,4) FROM public.products WHERE slug = 'lip-oil-glow';

INSERT INTO public.product_variants (product_id, name, sort_order)
SELECT id, unnest(ARRAY['Natural', 'Rosado', 'Escuro', 'Universal']), generate_series(1,4) FROM public.products WHERE slug = 'lip-liner-precision';

INSERT INTO public.product_variants (product_id, name, sort_order)
SELECT id, unnest(ARRAY['Clear', 'Pink Shimmer', 'Peach Glow', 'Rose Quartz']), generate_series(1,4) FROM public.products WHERE slug = 'gloss-plumper-volume';

-- Link products to collections
INSERT INTO public.collection_products (collection_id, product_id, sort_order)
SELECT c.id, p.id, 1 FROM public.collections c, public.products p WHERE c.slug = 'bestsellers' AND p.slug = 'gloss-velvet-rose'
UNION ALL SELECT c.id, p.id, 2 FROM public.collections c, public.products p WHERE c.slug = 'bestsellers' AND p.slug = 'lip-tint-aquarelle'
UNION ALL SELECT c.id, p.id, 3 FROM public.collections c, public.products p WHERE c.slug = 'bestsellers' AND p.slug = 'lip-liner-precision'
UNION ALL SELECT c.id, p.id, 1 FROM public.collections c, public.products p WHERE c.slug = 'novidades' AND p.slug = 'batom-matte-luxe'
UNION ALL SELECT c.id, p.id, 2 FROM public.collections c, public.products p WHERE c.slug = 'novidades' AND p.slug = 'lip-oil-glow'
UNION ALL SELECT c.id, p.id, 3 FROM public.collections c, public.products p WHERE c.slug = 'novidades' AND p.slug = 'gloss-plumper-volume';
