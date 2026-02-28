import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  user_id: string;
  name: string;
  email: string;
  roles: string[];
  type: 'super_admin' | 'admin_only';
}

export const useAdminUsers = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'users'],
    staleTime: 60_000,
    queryFn: async (): Promise<AdminUser[]> => {
      // Get all roles
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rolesErr) throw rolesErr;

      // Get all profiles
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, name, email');
      if (profErr) throw profErr;

      // Group roles by user_id
      const roleMap: Record<string, string[]> = {};
      for (const r of roles || []) {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      }

      // Build user list
      const userIds = Object.keys(roleMap);
      return userIds.map(uid => {
        const profile = profiles?.find(p => p.user_id === uid);
        const userRoles = roleMap[uid];
        const isSuperAdmin = userRoles.includes('admin') && userRoles.includes('financeiro');
        return {
          user_id: uid,
          name: profile?.name || '',
          email: profile?.email || '',
          roles: userRoles,
          type: isSuperAdmin ? 'super_admin' : 'admin_only',
        };
      });
    },
  });

  const createUser = useMutation({
    mutationFn: async (payload: { email: string; password: string; name: string; role: 'super_admin' | 'admin_only' }) => {
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: payload,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const deleteUserRoles = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  return { ...query, createUser, deleteUserRoles };
};
