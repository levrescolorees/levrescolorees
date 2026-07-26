import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'product-images';

const BESTSELLERS_ID = '0bcc3742-4542-4ad8-a5ba-abd6acc73ce3';
const NOVIDADES_ID = '6cd35810-908a-4b2b-abdd-bb66b367f47a';

const FAMILY_MAP: Record<string, string> = {
  F: 'Fair',
  L: 'Light',
  M: 'Medium',
  T: 'Tan',
  D: 'Deep',
};

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uploadImage(supabase: any, url: string, path: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image ${url}: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/png';
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed for ${path}: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') || 'bt-skin';
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    console.log(`[import-bt-skin] Fetching VTEX product: ${slug}`);
    const vtexRes = await fetch(
      `https://www.linhabrunatavares.com/api/catalog_system/pub/products/search/${slug}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!vtexRes.ok) throw new Error(`VTEX API error: ${vtexRes.status}`);
    const vtexArr = await vtexRes.json();
    if (!Array.isArray(vtexArr) || vtexArr.length === 0) {
      throw new Error('VTEX returned no products');
    }
    const p = vtexArr[0];
    console.log(`[import-bt-skin] Got product: ${p.productName} with ${p.items?.length} items`);

    // Base product images: pick up to 6 unique from first item
    const firstItemImages = (p.items?.[0]?.images || []) as any[];
    const uniqueBaseImages = Array.from(
      new Set(firstItemImages.map((i: any) => i.imageUrl).filter(Boolean)),
    ).slice(0, 6) as string[];

    const productSku = 'BTSKIN-40ML';

    // Check if product already exists
    const { data: existing } = await supabase
      .from('products')
      .select('id, slug')
      .eq('sku', productSku)
      .maybeSingle();

    // Upload base images
    console.log(`[import-bt-skin] Uploading ${uniqueBaseImages.length} base images`);
    const baseImageUrls: string[] = [];
    for (let i = 0; i < uniqueBaseImages.length; i++) {
      const uploaded = await uploadImage(
        supabase,
        uniqueBaseImages[i],
        `bt-skin/base-${i}.jpg`,
      );
      baseImageUrls.push(uploaded);
    }

    const description = String(p.description || '').trim();
    const shortDescription = String(p.metaTagDescription || '').trim().slice(0, 500);

    const productPayload = {
      name: 'BT Skin – Base Líquida Aveludada 40ml',
      sku: productSku,
      retail_price: 1,
      cost_price: 1,
      stock: 0,
      weight: 0.08,
      short_description: shortDescription,
      description,
      images: baseImageUrls,
      is_active: true,
      status: 'published',
      published_at: new Date().toISOString(),
      badge: 'Novo',
      seo_title: 'BT Skin Base Líquida Aveludada 40ml — Bruna Tavares',
      meta_description: shortDescription,
      updated_at: new Date().toISOString(),
    };

    let productId: string;
    let productSlug: string;

    if (existing) {
      productId = existing.id;
      productSlug = existing.slug;
      const { error } = await supabase.from('products').update(productPayload).eq('id', productId);
      if (error) throw new Error(`Product update failed: ${error.message}`);
      console.log(`[import-bt-skin] Updated existing product ${productId}`);
    } else {
      productSlug = `bt-skin-base-liquida-40ml-${Math.random().toString(36).slice(2, 8)}`;
      const { data: inserted, error } = await supabase
        .from('products')
        .insert({ ...productPayload, slug: productSlug })
        .select('id, slug')
        .single();
      if (error) throw new Error(`Product insert failed: ${error.message}`);
      productId = inserted.id;
      productSlug = inserted.slug;
      console.log(`[import-bt-skin] Created product ${productId} (${productSlug})`);
    }

    // Variants — one per tom
    console.log(`[import-bt-skin] Processing ${p.items.length} variants`);
    let variantsCount = 0;
    for (let idx = 0; idx < p.items.length; idx++) {
      const it = p.items[idx];
      const fullName: string = it.name || `Tom ${idx + 1}`;
      // "BT Skin F10" -> "F10"
      const tom = fullName.replace(/^BT Skin\s+/i, '').trim();
      const familyKey = tom.charAt(0).toUpperCase();
      const family = FAMILY_MAP[familyKey] || 'Outro';
      const variantSku = `BTSKIN-40ML-${tom}`;
      const displayName = `${family} ${tom}`;

      // Swatch = first image (typically 001-<TOM>.png)
      const swatchUrl = it.images?.[0]?.imageUrl;
      const variantImages: string[] = [];
      if (swatchUrl) {
        try {
          const uploaded = await uploadImage(
            supabase,
            swatchUrl,
            `bt-skin/tom-${slugify(tom)}.png`,
          );
          variantImages.push(uploaded);
        } catch (e) {
          console.error(`[import-bt-skin] Swatch upload failed for ${tom}:`, e);
        }
      }

      // Upsert variant by (product_id, sku)
      const { data: existingVariant } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', productId)
        .eq('sku', variantSku)
        .maybeSingle();

      const variantPayload = {
        product_id: productId,
        name: displayName,
        sku: variantSku,
        stock: 100,
        price_override: null as number | null,
        images: variantImages,
        sort_order: idx,
      };

      if (existingVariant) {
        const { error } = await supabase
          .from('product_variants')
          .update(variantPayload)
          .eq('id', existingVariant.id);
        if (error) throw new Error(`Variant update failed (${tom}): ${error.message}`);
      } else {
        const { error } = await supabase.from('product_variants').insert(variantPayload);
        if (error) throw new Error(`Variant insert failed (${tom}): ${error.message}`);
      }
      variantsCount++;
    }

    // Attach to collections (idempotent)
    for (const collectionId of [BESTSELLERS_ID, NOVIDADES_ID]) {
      const { data: existingLink } = await supabase
        .from('collection_products')
        .select('id')
        .eq('collection_id', collectionId)
        .eq('product_id', productId)
        .maybeSingle();
      if (!existingLink) {
        await supabase
          .from('collection_products')
          .insert({ collection_id: collectionId, product_id: productId, sort_order: 0 });
      }
    }

    const result = {
      success: true,
      product_id: productId,
      slug: productSlug,
      sku: productSku,
      variants_count: variantsCount,
      base_images: baseImageUrls.length,
      admin_url: `/admin/produtos/${productId}`,
      storefront_url: `/produto/${productSlug}`,
    };
    console.log('[import-bt-skin] Done:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('[import-bt-skin] Error:', err);
    return new Response(
      JSON.stringify({ error: String((err as Error).message || err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
