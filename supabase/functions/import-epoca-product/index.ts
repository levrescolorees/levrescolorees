import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'product-images';

const NOVIDADES_ID = '6cd35810-908a-4b2b-abdd-bb66b367f47a';
const BOCA_ROSA_ID = '27314226-83a8-464d-a968-a663f0993de4';

type ProductCfg = {
  vtexSlug: string;
  productName: string;
  productSku: string;
  slugBase: string;
  weight: number;
  storagePrefix: string;
  prefixToStrip?: RegExp;
};

const PRODUCTS: Record<string, ProductCfg> = {
  'base-mate': {
    vtexSlug: 'base-mate-boca-rosa-beauty-by-payot',
    productName: 'Base Mate Boca Rosa Beauty by Payot',
    productSku: 'BR-BASE-MATE',
    slugBase: 'base-mate-boca-rosa',
    weight: 0.05,
    storagePrefix: 'boca-rosa/base-mate',
  },
  'corretivo': {
    vtexSlug: 'corretivo-liquido-payot-boca-rosa-beauty',
    productName: 'Corretivo Líquido Payot Boca Rosa Beauty',
    productSku: 'BR-CORRETIVO',
    slugBase: 'corretivo-liquido-boca-rosa',
    weight: 0.04,
    storagePrefix: 'boca-rosa/corretivo',
  },
  'mascara': {
    vtexSlug: 'mascara-para-cilios--meuvolumao-boca-rosa---preto-6g-232523',
    productName: 'Máscara para Cílios #MeuVolumão Boca Rosa – Preto 6g',
    productSku: 'BR-MASCARA-VOLUMAO',
    slugBase: 'mascara-cilios-meuvolumao-boca-rosa',
    weight: 0.05,
    storagePrefix: 'boca-rosa/mascara-volumao',
  },
  'po-solto': {
    vtexSlug: 'po-facial-payot-boca-rosa-beauty-po-solto-facial',
    productName: 'Pó Solto Facial Payot Boca Rosa Beauty',
    productSku: 'BR-PO-SOLTO',
    slugBase: 'po-solto-facial-boca-rosa',
    weight: 0.05,
    storagePrefix: 'boca-rosa/po-solto',
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

async function uploadImage(supabase: any, url: string, path: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed to fetch image ${url}: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';
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
    const key = url.searchParams.get('product');
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const keysToRun = key === 'all' || !key
      ? Object.keys(PRODUCTS)
      : [key];

    const results: any[] = [];

    for (const k of keysToRun) {
      const cfg = PRODUCTS[k];
      if (!cfg) {
        results.push({ key: k, error: `Unknown product. Use: ${Object.keys(PRODUCTS).join(', ')}` });
        continue;
      }

      try {
        console.log(`[import-epoca] Fetching VTEX: ${cfg.vtexSlug}`);
        const vtexRes = await fetch(
          `https://www.epocacosmeticos.com.br/api/catalog_system/pub/products/search/${cfg.vtexSlug}/p`,
          { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } },
        );
        if (!vtexRes.ok) throw new Error(`VTEX API error: ${vtexRes.status}`);
        const vtexArr = await vtexRes.json();
        if (!Array.isArray(vtexArr) || vtexArr.length === 0) throw new Error('VTEX returned no products');
        const p = vtexArr[0];
        console.log(`[import-epoca] ${p.productName} with ${p.items?.length} items`);

        // Base images: pega imagens do primeiro item, remove duplicatas
        const firstItemImages = (p.items?.[0]?.images || []) as any[];
        const baseCandidates = firstItemImages
          .map((i: any) => i.imageUrl as string)
          .filter(Boolean);
        const uniqueBaseImages = Array.from(new Set(baseCandidates)).slice(0, 6);

        const baseImageUrls: string[] = [];
        for (let i = 0; i < uniqueBaseImages.length; i++) {
          const uploaded = await uploadImage(
            supabase,
            uniqueBaseImages[i],
            `${cfg.storagePrefix}/base-${i}.jpg`,
          );
          baseImageUrls.push(uploaded);
        }

        const description = String(p.description || '').trim();
        const shortDescription = String(p.metaTagDescription || '').trim().slice(0, 500);

        const productPayload: any = {
          name: cfg.productName,
          sku: cfg.productSku,
          retail_price: 13.99,
          cost_price: 13.99,
          stock: 0,
          weight: cfg.weight,
          short_description: shortDescription,
          description,
          images: baseImageUrls,
          is_active: true,
          status: 'published',
          published_at: new Date().toISOString(),
          badge: 'Novo',
          seo_title: `${cfg.productName} — Boca Rosa`,
          meta_description: shortDescription,
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
        console.log(`[import-epoca] Product ${productId} (${productSlug})`);

        // Variantes (só cria se tiver mais de 1 item ou o único item tiver nome distinto do produto)
        let variantsCount = 0;
        const items = p.items || [];
        const shouldCreateVariants = items.length > 1;

        if (shouldCreateVariants) {
          for (let idx = 0; idx < items.length; idx++) {
            const it = items[idx];
            const shade: string = (it.name || `Tom ${idx + 1}`).trim();
            const variantSku = `${cfg.productSku}-${slugify(shade).toUpperCase()}`;

            const swatchUrl = it.images?.[0]?.imageUrl;
            const variantImages: string[] = [];
            if (swatchUrl) {
              try {
                const uploaded = await uploadImage(
                  supabase,
                  swatchUrl,
                  `${cfg.storagePrefix}/tom-${slugify(shade)}.jpg`,
                );
                variantImages.push(uploaded);
              } catch (e) {
                console.error(`[import-epoca] Swatch failed for ${shade}:`, e);
              }
            }

            const { data: existingVariant } = await supabase
              .from('product_variants')
              .select('id')
              .eq('product_id', productId)
              .eq('sku', variantSku)
              .maybeSingle();

            const variantPayload = {
              product_id: productId,
              name: shade,
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
              if (error) throw new Error(`Variant update (${shade}): ${error.message}`);
            } else {
              const { error } = await supabase.from('product_variants').insert(variantPayload);
              if (error) throw new Error(`Variant insert (${shade}): ${error.message}`);
            }
            variantsCount++;
          }
        } else {
          // Produto sem variantes: seta o estoque no próprio produto
          await supabase.from('products').update({ stock: 100 }).eq('id', productId);
        }

        // Coleções: Boca Rosa + Novidades
        for (const collectionId of [BOCA_ROSA_ID, NOVIDADES_ID]) {
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

        results.push({
          key: k,
          success: true,
          product_id: productId,
          slug: productSlug,
          sku: cfg.productSku,
          variants_count: variantsCount,
          base_images: baseImageUrls.length,
          storefront_url: `/produto/${productSlug}`,
        });
      } catch (err) {
        console.error(`[import-epoca] ${k} failed:`, err);
        results.push({ key: k, error: String((err as Error).message || err) });
      }
    }

    return new Response(JSON.stringify({ results }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('[import-epoca] Fatal:', err);
    return new Response(
      JSON.stringify({ error: String((err as Error).message || err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
