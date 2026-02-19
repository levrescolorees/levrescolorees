import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BrandSettings {
  name: string;
  tagline: string;
}

export interface HeroSettings {
  headline: string;
  subheadline: string;
  cta_text: string;
  cta_link: string;
}

export function useStoreSettings() {
  return useQuery({
    queryKey: ['store_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_settings').select('*');
      if (error) throw error;
      const map: Record<string, any> = {};
      data.forEach((r: any) => { map[r.key] = r.value; });
      return map as { brand?: BrandSettings; hero?: HeroSettings; [key: string]: any };
    },
    staleTime: 60_000,
  });
}

export function useShippingRules() {
  return useQuery({
    queryKey: ['shipping_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('shipping_rules').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}
