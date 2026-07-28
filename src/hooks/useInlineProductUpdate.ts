import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type InlineField = 'retail_price' | 'stock';

interface InlineUpdatePayload {
  id: string;
  name: string;
  field: InlineField;
  oldValue: number;
  newValue: number;
}

export function useInlineProductUpdate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, field, oldValue, newValue }: InlineUpdatePayload) => {
      const { error } = await supabase
        .from('products')
        .update({ [field]: newValue, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      await supabase.from('audit_logs').insert({
        action: field === 'retail_price' ? 'product_price_updated' : 'product_stock_updated',
        entity_type: 'product',
        entity_id: id,
        user_id: user?.id ?? null,
        details: {
          product_name: name,
          field,
          old_value: oldValue,
          new_value: newValue,
          user_email: user?.email ?? null,
        },
      });

      return { id, field, newValue };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products-list'] });
      qc.invalidateQueries({ queryKey: ['admin', 'product-audit'] });
    },
  });
}
