import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'product-images';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const COLLECTION_SLUG = 'ruby-rose-melu';
const NOVIDADES_ID = '6cd35810-908a-4b2b-abdd-bb66b367f47a';

const PRODUCT = {
  productName: 'Pó Solto Areia das Dunas – Melu Ruby Rose',
  productSku: 'RRM404',
  slugBase: 'po-solto-areia-das-dunas-melu-ruby-rose',
  storagePrefix: 'melu-areia-das-dunas',
  retailPrice: 8.9,
  costPrice: 1,
  variants: [
    { shade: 'Horizonte Místico', sku: 'RRM404-1', url: 'https://www.melumaquiagem.com.br/produto/30056-po-solto-areia-das-dunas-horizonte-mistico-made-in-rrm404-1-melu-ruby-rose' },
    { shade: 'Encanto das Pedras', sku: 'RRM404-3', url: 'https://www.melumaquiagem.com.br/produto/30055-po-solto-areia-das-dunas-encanto-das-pedras-made-in-rrm404-3-melu-ruby-rose' },
    { shade: 'Calor do Nordeste', sku: 'RRM404-4', url: 'https://www.melumaquiagem.com.br/produto/30054-po-solto-areia-das-dunas-calor-do-nordeste-made-in-rrm404-4-melu-ruby-rose' },
  ],
};

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
  const html = await res.text();
  return html.replace(/\\\//g, '/');
}

function extractLd(html: string): Record<string, any> | null {
  const matches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1].replace(/\//g, '/'));
      if (parsed && parsed['@type'] === 'Product') return parsed;
    } catch {
      // ignore malformed blocks
    }
  }
  return null;
}

// Only images inside the product gallery carousel belong to this SKU.
// Anything else on the page (related products, banners) must be ignored.
function extractImages(html: string): string[] {
  const start = html.indexOf('product-gallery__carousel');
  if (start === -1) return [];
  const end = html.indexOf('</section>', start);
  const segment = html.slice(start, end === -1 ? undefined : end);
  const found = Array.from(segment.matchAll(/data-image="([^"]+)"/g)).map((m) => m[1]);
  const normalized = found
    .map((u) => (u.startsWith('//') ? `https:${u}` : u))
    .filter((u) => !/_detalhe\./.test(u));
  return Array.from(new Set(normalized));
}

async function uploadImage(supabase: any, url: string, path: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Failed to fetch image ${url}: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/png';
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed for ${path}: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const cfg = PRODUCT;

    // 1. Scrape all variant pages
    const scraped: Array<{ shade: string; sku: string; images: string[]; ld: any }> = [];
    for (const v of cfg.variants) {
      const html = await fetchPage(v.url);
      const ld = extractLd(html);
      const images = extractImages(html);
      console.log(`[import-melu] ${v.sku}: ld=${!!ld} imgs=${images.length}`);
      scraped.push({ shade: v.shade, sku: v.sku, images, ld });
    }

    const firstLd = scraped.find((s) => s.ld)?.ld;
    if (!firstLd) throw new Error('No JSON-LD product data found on any page');

    const description = String(firstLd.description || '').trim();
    const shortDescription = description.slice(0, 300);
    const weight = Number(firstLd?.weight?.value) || 0.061;

    // 2. Unique per-shade image = first image of each page; shared images = present on all pages
    const shadePrimary = new Map<string, string>();
    const counts = new Map<string, number>();
    for (const s of scraped) {
      if (s.images[0]) shadePrimary.set(s.sku, s.images[0]);
      for (const img of s.images) counts.set(img, (counts.get(img) || 0) + 1);
    }
    const sharedImages = Array.from(counts.entries())
      .filter(([, c]) => c === scraped.length)
      .map(([img]) => img);

    // 3. Upload product gallery: first shade packshot + shared campaign images
    const galleryUrls: string[] = [];
    const firstShadeImg = shadePrimary.get(cfg.variants[0].sku);
    const gallerySources = [...(firstShadeImg ? [firstShadeImg] : []), ...sharedImages.filter((i) => i !== firstShadeImg)];
    for (let i = 0; i < gallerySources.length; i++) {
      const ext = gallerySources[i].split('.').pop()!.split('?')[0];
      galleryUrls.push(await uploadImage(supabase, gallerySources[i], `${cfg.storagePrefix}/base-${i}.${ext}`));
    }

    const productPayload = {
      name: cfg.productName,
      sku: cfg.productSku,
      retail_price: cfg.retailPrice,
      cost_price: cfg.costPrice,
      stock: 0,
      weight,
      short_description: shortDescription,
      description,
      images: galleryUrls,
      is_active: true,
      status: 'published',
      published_at: new Date().toISOString(),
      badge: 'Novo',
      seo_title: `${cfg.productName} — Lèvres Colorées`,
      meta_description: shortDescription.slice(0, 160),
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('products')
      .select('id, slug')
      .eq('sku', cfg.productSku)
      .maybeSingle();

    let productId: string;
    let productSlug: string;

    if (existing) {
      productId = existing.id;
      productSlug = existing.slug;
      const { error } = await supabase.from('products').update(productPayload).eq('id', productId);
      if (error) throw new Error(`Product update failed: ${error.message}`);
    } else {
      productSlug = `${cfg.slugBase}-${Math.random().toString(36).slice(2, 8)}`;
      const { data: inserted, error } = await supabase
        .from('products')
        .insert({ ...productPayload, slug: productSlug })
        .select('id, slug')
        .single();
      if (error) throw new Error(`Product insert failed: ${error.message}`);
      productId = inserted.id;
      productSlug = inserted.slug;
    }
    console.log(`[import-melu] Product ${productId} (${productSlug})`);

    // 4. Variants
    let variantsCount = 0;
    for (let idx = 0; idx < scraped.length; idx++) {
      const s = scraped[idx];
      const src = shadePrimary.get(s.sku);
      const variantImages: string[] = [];
      if (src) {
        try {
          const ext = src.split('.').pop()!.split('?')[0];
          variantImages.push(await uploadImage(supabase, src, `${cfg.storagePrefix}/tom-${slugify(s.shade)}.${ext}`));
        } catch (e) {
          console.error(`[import-melu] Image failed for ${s.shade}:`, e);
        }
      }

      const { data: existingVariant } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', productId)
        .eq('sku', s.sku)
        .maybeSingle();

      const variantPayload = {
        product_id: productId,
        name: s.shade,
        sku: s.sku,
        stock: 100,
        price_override: null as number | null,
        images: variantImages,
        sort_order: idx,
      };

      if (existingVariant) {
        const { error } = await supabase.from('product_variants').update(variantPayload).eq('id', existingVariant.id);
        if (error) throw new Error(`Variant update (${s.shade}): ${error.message}`);
      } else {
        const { error } = await supabase.from('product_variants').insert(variantPayload);
        if (error) throw new Error(`Variant insert (${s.shade}): ${error.message}`);
      }
      variantsCount++;
    }

    // 5. Collections
    const { data: brandCollection } = await supabase
      .from('collections')
      .select('id')
      .eq('slug', COLLECTION_SLUG)
      .maybeSingle();

    const collectionIds = [brandCollection?.id, NOVIDADES_ID].filter(Boolean) as string[];
    for (const collectionId of collectionIds) {
      const { data: link } = await supabase
        .from('collection_products')
        .select('id')
        .eq('collection_id', collectionId)
        .eq('product_id', productId)
        .maybeSingle();
      if (!link) {
        await supabase.from('collection_products').insert({ collection_id: collectionId, product_id: productId, sort_order: 0 });
      }
    }

    const result = {
      success: true,
      product_id: productId,
      slug: productSlug,
      sku: cfg.productSku,
      variants_count: variantsCount,
      base_images: galleryUrls.length,
      admin_url: `/admin/produtos/${productId}`,
      storefront_url: `/produto/${productSlug}`,
    };
    console.log('[import-melu] Done:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('[import-melu] Error:', err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
