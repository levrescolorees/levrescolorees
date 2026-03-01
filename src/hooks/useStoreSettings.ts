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

// Theme interfaces moved to src/theme/defaultTheme.ts

export interface PublicMercadoPagoSettings {
  public_key?: string;
  enabled?: boolean;
  pix_enabled?: boolean;
  card_enabled?: boolean;
  boleto_enabled?: boolean;
  max_installments?: number;
  environment?: 'sandbox' | 'production';
}

export type PublicStoreSettings = {
  brand?: BrandSettings;
  hero?: HeroSettings;
  mercado_pago?: PublicMercadoPagoSettings;
  [key: string]: unknown;
};

export function useStoreSettings() {
  return useQuery({
    queryKey: ['store_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_store_settings');
      if (error) throw error;
      return (data || {}) as PublicStoreSettings;
    },
    staleTime: 10 * 60_000,
  });
}

export function useAdminStoreSettings() {
  return useQuery({
    queryKey: ['store_settings_admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_settings').select('*');
      if (error) throw error;
      const map: Record<string, unknown> = {};
      data.forEach((row) => {
        map[row.key] = row.value;
      });
      return map as PublicStoreSettings;
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
