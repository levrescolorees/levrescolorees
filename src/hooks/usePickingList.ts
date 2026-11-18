import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PickingItem { id: string; sku: string | null; product_name: string; variant_name: string | null; quantity: number }

export const usePickingList = (id?: string) => useQuery({
  queryKey: ['manual-orders', 'picking', id],
  enabled: !!id,
  queryFn: async () => {
    const { data, error } = await (supabase as any).from('manual_orders')
      .select('id, order_number, status, notes, created_at, tenants(name), customers(name, company_name, phone, cpf, cnpj, email), manual_order_items(id, product_name, variant_name, quantity, products(sku), product_variants(sku))')
      .eq('id', id).single();
    if (error) throw error;
    const items: PickingItem[] = (data.manual_order_items ?? []).map((i: any) => ({
      id: i.id, product_name: i.product_name, variant_name: i.variant_name, quantity: i.quantity,
      sku: i.product_variants?.sku || i.products?.sku || null,
    })).sort((a: PickingItem, b: PickingItem) => (a.sku ?? '~').localeCompare(b.sku ?? '~') || a.product_name.localeCompare(b.product_name));
    return { ...data, items };
  },
});
