import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DBProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  short_description: string;
  description: string;
  retail_price: number;
  cost_price: number;
  images: string[];
  rating: number;
  reviews_count: number;
  is_active: boolean;
  stock: number;
  badge: string | null;
  ideal_for_resale: boolean;
  suggested_margin: number;
  status: string;
  published_at: string | null;
  seo_title: string;
  meta_description: string;
  created_at: string;
  updated_at: string;
}

export interface DBPriceRule {
  id: string;
  product_id: string;
  min_quantity: number;
  price: number;
  label: string;
  is_active: boolean;
}

export interface DBVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_override: number | null;
  stock: number;
  images: string[];
  sort_order: number;
}

export interface DBCollection {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  collection_type: string;
  sort_order: number;
  is_active: boolean;
}

// ---- Storefront queries ----

export function useStorefrontProducts() {
  return useQuery({
    queryKey: ['products', 'storefront'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const productIds = (products as DBProduct[]).map(p => p.id);

      const [{ data: variants }, { data: priceRules }, { data: collectionProducts }] = await Promise.all([
        supabase.from('product_variants').select('*').in('product_id', productIds).order('sort_order'),
        supabase.from('price_rules').select('*').in('product_id', productIds).eq('is_active', true).order('min_quantity'),
        supabase.from('collection_products').select('*, collections(*)').in('product_id', productIds),
      ]);

      return (products as DBProduct[]).map(p => ({
        ...p,
        variants: (variants as DBVariant[] || []).filter(v => v.product_id === p.id),
        priceRules: (priceRules as DBPriceRule[] || []).filter(r => r.product_id === p.id),
        collections: (collectionProducts as any[] || [])
          .filter(cp => cp.product_id === p.id)
          .map(cp => cp.collections)
          .filter(Boolean),
      }));
    },
  });
}

export function useProductBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['product', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug!)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      if (!product) return null;

      const p = product as DBProduct;
      const [{ data: variants }, { data: priceRules }] = await Promise.all([
        supabase.from('product_variants').select('*').eq('product_id', p.id).order('sort_order'),
        supabase.from('price_rules').select('*').eq('product_id', p.id).eq('is_active', true).order('min_quantity'),
      ]);

      return {
        ...p,
        variants: (variants as DBVariant[]) || [],
        priceRules: (priceRules as DBPriceRule[]) || [],
      };
    },
  });
}

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as DBCollection[];
    },
  });
}

// ---- Admin queries ----

export function useAdminProducts() {
  return useQuery({
    queryKey: ['admin', 'products'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const ids = (data as DBProduct[]).map(p => p.id);
      const [{ data: variants }, { data: priceRules }, { data: collectionProducts }] = await Promise.all([
        supabase.from('product_variants').select('*').in('product_id', ids).order('sort_order'),
        supabase.from('price_rules').select('*').in('product_id', ids).order('min_quantity'),
        supabase.from('collection_products').select('*, collections(*)').in('product_id', ids),
      ]);

      return (data as DBProduct[]).map(p => ({
        ...p,
        variants: (variants as DBVariant[] || []).filter(v => v.product_id === p.id),
        priceRules: (priceRules as DBPriceRule[] || []).filter(r => r.product_id === p.id),
        collections: (collectionProducts as any[] || [])
          .filter(cp => cp.product_id === p.id)
          .map(cp => cp.collections)
          .filter(Boolean) as DBCollection[],
      }));
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'products'] }),
  });
}

export function useToggleProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('products').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'products'] }),
  });
}

// Smart price helper from DB price rules
export function getSmartPriceFromRules(retailPrice: number, priceRules: DBPriceRule[], quantity: number) {
  const sorted = [...priceRules].sort((a, b) => b.min_quantity - a.min_quantity);
  const rule = sorted.find(r => quantity >= r.min_quantity);
  if (rule) {
    return {
      price: rule.price,
      label: rule.label,
      discount: Math.round((1 - rule.price / retailPrice) * 100),
    };
  }
  return { price: retailPrice, label: 'Varejo', discount: 0 };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
