import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'product-images';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const COLLECTION_SLUG = 'ruby-rose-melu';

type VariantCfg = { shade: string; sku: string; url: string };
type ProductCfg = {
  productName: string;
  productSku: string;
  slugBase: string;
  storagePrefix: string;
  retailPrice: number;
  costPrice: number;
  variants: VariantCfg[];
  singleVariant?: boolean; // product without color variants
};

const RR = 'https://www.rubyrosemaquiagem.com.br/produto';
const MELU = 'https://www.melumaquiagem.com.br/produto';

const PRODUCTS: Record<string, ProductCfg> = {
  'melu-mascaras': {
    productName: 'Máscara para Cílios Melu Ruby Rose',
    productSku: 'RR-MELU-MASCARAS',
    slugBase: 'mascara-para-cilios-melu-ruby-rose',
    storagePrefix: 'melu-mascaras-cilios',
    retailPrice: 8.9,
    costPrice: 1,
    variants: [
      { shade: 'Peel Off Challenge', sku: 'RR51513', url: `${MELU}/345-mascara-para-cilios-peel-off-challenge-rr51513-melu-rubyrose` },
      { shade: 'Extreme', sku: 'RR5711-2', url: `${MELU}/340-mascara-para-cilios-extreme-rr5711-2-melu-by-rubyrose` },
      { shade: 'Peel Off Like It', sku: 'RR51512', url: `${MELU}/338-mascara-para-cilios-peel-off-like-it-rr51512-melu-rubyrose` },
    ],
  },
  'soft-blend': {
    productName: 'Soft Blend Base Líquida – Ruby Rose',
    productSku: 'HBM301',
    slugBase: 'soft-blend-base-liquida-ruby-rose',
    storagePrefix: 'rubyrose-soft-blend',
    retailPrice: 8.9,
    costPrice: 1,
    variants: [
      { shade: 'F10', sku: 'HBM301-1', url: `${RR}/3623-soft-blend-base-liquida-f10-hbm301-1-rubyrose` },
      { shade: 'F20', sku: 'HBM301-2', url: `${RR}/3624-soft-blend-base-liquida-f20-hbm301-2-rubyrose` },
      { shade: 'F30', sku: 'HBM301-3', url: `${RR}/3625-soft-blend-base-liquida-f30-hbm301-3-rubyrose` },
      { shade: 'F40', sku: 'HBM301-4', url: `${RR}/3626-soft-blend-base-liquida-f40-hbm301-4-rubyrose` },
      { shade: 'F50', sku: 'HBM301-5', url: `${RR}/3627-soft-blend-base-liquida-f50-hbm301-5-rubyrose` },
      { shade: 'F60', sku: 'HBM301-6', url: `${RR}/3628-soft-blend-base-liquida-f60-hbm301-6-rubyrose` },
      { shade: 'F70', sku: 'HBM301-7', url: `${RR}/3687-soft-blend-base-liquida-f70-hbm301-7-rubyrose` },
      { shade: 'F80', sku: 'HBM301-8', url: `${RR}/3688-soft-blend-base-liquida-f80-hbm301-8-rubyrose` },
      { shade: 'F90', sku: 'HBM301-9', url: `${RR}/3689-soft-blend-base-liquida-f90-hbm301-9-rubyrose` },
      { shade: 'F100', sku: 'HBM301-10', url: `${RR}/3690-soft-blend-base-liquida-f100-hbm301-10-rubyrose` },
      { shade: 'F110', sku: 'HBM301-11', url: `${RR}/3691-soft-blend-base-liquida-f110-hbm301-11-rubyrose` },
      { shade: 'F120', sku: 'HBM301-12', url: `${RR}/3692-soft-blend-base-liquida-f120-hbm301-12-rubyrose` },
    ],
  },
  'gel-game-on': {
    productName: 'Gel Incolor Cílios + Sobrancelhas Game On – Ruby Rose',
    productSku: 'HB509',
    slugBase: 'gel-incolor-cilios-sobrancelhas-game-on-ruby-rose',
    storagePrefix: 'rubyrose-gel-game-on',
    retailPrice: 8.9,
    costPrice: 1,
    singleVariant: true,
    variants: [
      { shade: 'Incolor', sku: 'HB509', url: `${RR}/1381-gel-incolor-cilios-sobrancelhas-game-on-hb509-rubyrose` },
    ],
  },
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
      const parsed = JSON.parse(m[1]);
      if (parsed && parsed['@type'] === 'Product') return parsed;
    } catch {
      // ignore malformed blocks
    }
  }
  return null;
}

// Two CDNLive themes: melumaquiagem uses `product-gallery__carousel`,
// rubyrosemaquiagem uses `<div class="gallery">`. Only the product's own
// gallery is read so no unrelated/related-product images leak in.
function extractImages(html: string): string[] {
  let found: string[] = [];
  const carousel = html.indexOf('product-gallery__carousel');
  if (carousel > -1) {
    const end = html.indexOf('</section>', carousel);
    const segment = html.slice(carousel, end === -1 ? undefined : end);
    found = Array.from(segment.matchAll(/data-image="([^"]+)"/g)).map((m) => m[1]);
  } else {
    const start = html.indexOf('class="gallery"');
    if (start === -1) return [];
    let segment = html.slice(start, start + 9000);
    const end = segment.indexOf('class="col-md-6"', 100);
    if (end > 0) segment = segment.slice(0, end);
    found = Array.from(segment.matchAll(/href="([^"]*_zoom[^"]*)"/g)).map((m) => m[1]);
  }
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
    const key = new URL(req.url).searchParams.get('product') || '';
    const cfg = PRODUCTS[key];
    if (!cfg) {
      throw new Error(`Unknown product key "${key}". Use one of: ${Object.keys(PRODUCTS).join(', ')}`);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Scrape every variant page
    const scraped: Array<{ shade: string; sku: string; images: string[]; ld: any }> = [];
    for (const v of cfg.variants) {
      const html = await fetchPage(v.url);
      const ld = extractLd(html);
      const images = extractImages(html);
      console.log(`[import-cdnlive] ${key}/${v.sku}: ld=${!!ld} imgs=${images.length}`);
      scraped.push({ shade: v.shade, sku: v.sku, images, ld });
    }

    const firstLd = scraped.find((s) => s.ld)?.ld;
    if (!firstLd) throw new Error('No JSON-LD product data found on any page');

    const description = String(firstLd.description || '').trim();
    const shortDescription = description.slice(0, 300);
    const weight = Number(firstLd?.weight?.value) || 0.05;

    // 2. Upload every image; each shade's own gallery stays with that shade
    const variantImageMap = new Map<string, string[]>();
    const galleryUrls: string[] = [];
    for (const s of scraped) {
      const uploaded: string[] = [];
      for (let i = 0; i < s.images.length; i++) {
        try {
          const ext = s.images[i].split('.').pop()!.split('?')[0];
          const publicUrl = await uploadImage(
            supabase,
            s.images[i],
            `${cfg.storagePrefix}/${slugify(s.shade)}-${i}.${ext}`,
          );
          uploaded.push(publicUrl);
          if (!galleryUrls.includes(publicUrl)) galleryUrls.push(publicUrl);
        } catch (e) {
          console.error(`[import-cdnlive] Image failed for ${s.shade}:`, e);
        }
      }
      variantImageMap.set(s.sku, uploaded);
    }

    const productPayload = {
      name: cfg.productName,
      sku: cfg.productSku,
      retail_price: cfg.retailPrice,
      cost_price: cfg.costPrice,
      stock: cfg.singleVariant ? 100 : 0,
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

    // 3. Variants (skipped for single-variant products)
    let variantsCount = 0;
    if (!cfg.singleVariant) {
      for (let idx = 0; idx < scraped.length; idx++) {
        const s = scraped[idx];
        const variantPayload = {
          product_id: productId,
          name: s.shade,
          sku: s.sku,
          stock: 100,
          price_override: null as number | null,
          images: variantImageMap.get(s.sku) || [],
          sort_order: idx,
        };

        const { data: existingVariant } = await supabase
          .from('product_variants')
          .select('id')
          .eq('product_id', productId)
          .eq('sku', s.sku)
          .maybeSingle();

        if (existingVariant) {
          const { error } = await supabase
            .from('product_variants')
            .update(variantPayload)
            .eq('id', existingVariant.id);
          if (error) throw new Error(`Variant update (${s.shade}): ${error.message}`);
        } else {
          const { error } = await supabase.from('product_variants').insert(variantPayload);
          if (error) throw new Error(`Variant insert (${s.shade}): ${error.message}`);
        }
        variantsCount++;
      }
    }

    // 4. Collection
    const { data: brandCollection } = await supabase
      .from('collections')
      .select('id')
      .eq('slug', COLLECTION_SLUG)
      .maybeSingle();

    if (brandCollection?.id) {
      const { data: link } = await supabase
        .from('collection_products')
        .select('id')
        .eq('collection_id', brandCollection.id)
        .eq('product_id', productId)
        .maybeSingle();
      if (!link) {
        await supabase
          .from('collection_products')
          .insert({ collection_id: brandCollection.id, product_id: productId, sort_order: 0 });
      }
    }

    const result = {
      success: true,
      key,
      product_id: productId,
      slug: productSlug,
      sku: cfg.productSku,
      variants_count: variantsCount,
      images: galleryUrls.length,
      admin_url: `/admin/produtos/${productId}`,
      storefront_url: `/produto/${productSlug}`,
    };
    console.log('[import-cdnlive] Done:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('[import-cdnlive] Error:', err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
