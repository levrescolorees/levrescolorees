import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Tenant { id: string; name: string; slug: string; is_active: boolean }

export const useTenants = () => useQuery({
  queryKey: ['tenants'],
  staleTime: 60_000,
  queryFn: async (): Promise<Tenant[]> => {
    const { data, error } = await (supabase as any).from('tenants').select('id, name, slug, is_active').order('name');
    if (error) throw error;
    return data;
  },
});
