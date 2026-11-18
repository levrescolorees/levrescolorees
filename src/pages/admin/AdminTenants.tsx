import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenants } from '@/hooks/useTenants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Building2, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const AdminTenants = () => {
  const qc = useQueryClient();
  const { data = [], isLoading } = useTenants();
  const [name, setName] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const db = supabase as any;
  const refresh = () => qc.invalidateQueries({ queryKey: ['tenants'] });

  const create = async () => {
    if (!name.trim()) return;
    const { error } = await db.from('tenants').insert({ name: name.trim(), slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 5)}` });
    if (error) return toast.error(error.message);
    setName(''); refresh(); toast.success('Filial criada');
  };
  const update = async (id: string, patch: any) => {
    const { error } = await db.from('tenants').update(patch).eq('id', id);
    if (error) return toast.error(error.message);
    refresh(); toast.success('Filial atualizada');
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold">Filiais</h1>
      <Card><CardHeader><CardTitle className="text-base">Nova filial</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Ex.: Loja Parceira Centro" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} />
          <Button onClick={create}><Plus className="w-4 h-4 mr-1" />Criar</Button>
        </CardContent>
      </Card>
      <Card><CardContent className="p-0 divide-y divide-border">
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Carregando...</p>}
        {data.map(t => (
          <div key={t.id} className="flex items-center gap-3 p-4">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <Input value={edits[t.id] ?? t.name} onChange={e => setEdits({ ...edits, [t.id]: e.target.value })} />
            {edits[t.id] !== undefined && edits[t.id] !== t.name && (
              <Button size="icon" variant="ghost" onClick={() => { update(t.id, { name: edits[t.id] }); setEdits(({ [t.id]: _, ...r }) => r); }}><Check className="w-4 h-4" /></Button>)}
            <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
              Ativa <Switch checked={t.is_active} onCheckedChange={v => update(t.id, { is_active: v })} />
            </div>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
};
export default AdminTenants;
