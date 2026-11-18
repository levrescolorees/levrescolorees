import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const TenantTeam = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'vendedor' });
  const [saving, setSaving] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ['tenant-team'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('profiles').select('user_id, name, email').order('name');
      if (error) throw error;
      return data as any[];
    },
  });

  const create = async () => {
    if (!form.name || !form.email || form.password.length < 6) return toast.error('Preencha nome, e-mail e senha (mín. 6)');
    setSaving(true);
    const { data: res, error } = await supabase.functions.invoke('create-admin-user', { body: form });
    setSaving(false);
    if (error || res?.error) return toast.error(res?.error || error?.message || 'Erro');
    toast.success('Usuário criado na sua filial');
    setForm({ name: '', email: '', password: '', role: 'vendedor' });
    qc.invalidateQueries({ queryKey: ['tenant-team'] });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold">Equipe da Filial</h1>
      <Card><CardHeader><CardTitle className="text-base">Adicionar pessoa</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Senha</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
          <div><Label>Função</Label>
            <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="vendedor">Vendedora</SelectItem><SelectItem value="expedicao">Expedição</SelectItem></SelectContent>
            </Select></div>
          <Button onClick={create} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}Criar</Button>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-base">Pessoas da filial</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {data.map(p => <div key={p.user_id} className="px-6 py-3 text-sm"><b>{p.name || p.email}</b> <span className="text-muted-foreground">{p.email}</span></div>)}
        </CardContent>
      </Card>
    </div>
  );
};
export default TenantTeam;
