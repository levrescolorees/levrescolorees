import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface CouponRow {
  id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  used_count: number;
  collection_id: string | null;
  first_purchase_only: boolean;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

interface CouponForm {
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number;
  max_uses: string;
  first_purchase_only: boolean;
  is_active: boolean;
  expires_at: string;
}

const emptyForm: CouponForm = {
  code: '', description: '', discount_type: 'percentage', discount_value: 0,
  min_order_value: 0, max_uses: '', first_purchase_only: false, is_active: true, expires_at: '',
};

const AdminCoupons = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as CouponRow[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (data: CouponForm & { id?: string }) => {
      const payload = {
        code: data.code.toUpperCase().trim(),
        description: data.description,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order_value: data.min_order_value,
        max_uses: data.max_uses ? Number(data.max_uses) : null,
        first_purchase_only: data.first_purchase_only,
        is_active: data.is_active,
        expires_at: data.expires_at || null,
      };
      if (data.id) {
        const { error } = await supabase.from('coupons').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('coupons').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      setDialogOpen(false);
      toast.success(editing ? 'Cupom atualizado!' : 'Cupom criado!');
    },
    onError: () => toast.error('Erro ao salvar cupom.'),
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast.success('Cupom excluído.');
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('coupons').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (c: CouponRow) => {
    setEditing(c.id);
    setForm({
      code: c.code, description: c.description, discount_type: c.discount_type,
      discount_value: c.discount_value, min_order_value: c.min_order_value,
      max_uses: c.max_uses?.toString() ?? '', first_purchase_only: c.first_purchase_only,
      is_active: c.is_active, expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) { toast.error('Informe o código.'); return; }
    upsert.mutate({ ...form, id: editing || undefined });
  };

  const filtered = coupons?.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const formatDiscount = (c: CouponRow) =>
    c.discount_type === 'percentage' ? `${c.discount_value}%` : `R$ ${c.discount_value.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Cupons</h1>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo Cupom</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por código..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 font-body" />
      </div>

      <div className="bg-card rounded-lg shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desconto</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mín. Pedido</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uso</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Tag className="w-8 h-8 text-muted-foreground/50" />
                    <span>Nenhum cupom encontrado.</span>
                  </div>
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-body text-sm font-semibold text-foreground bg-muted px-2 py-0.5 rounded">{c.code}</span>
                    {c.description && <p className="font-body text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-foreground font-medium">{formatDiscount(c)}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">
                    {c.min_order_value > 0 ? `R$ ${c.min_order_value.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">
                    {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive.mutate({ id: c.id, is_active: !c.is_active })} className="flex items-center gap-1.5">
                      {c.is_active ? (
                        <><ToggleRight className="w-5 h-5 text-primary" /><span className="text-xs font-body text-primary">Ativo</span></>
                      ) : (
                        <><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span className="text-xs font-body text-muted-foreground">Inativo</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
                            <AlertDialogDescription>"{c.code}" será removido permanentemente.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCoupon.mutate(c.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-body text-sm font-medium text-foreground">Código *</label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required className="font-body mt-1 uppercase" placeholder="EX: PROMO10" />
              </div>
              <div>
                <label className="font-body text-sm font-medium text-foreground">Tipo</label>
                <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="font-body text-sm font-medium text-foreground">Descrição</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="font-body mt-1" placeholder="Descrição interna" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-body text-sm font-medium text-foreground">Valor *</label>
                <Input type="number" step="0.01" min="0" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))} className="font-body mt-1" />
              </div>
              <div>
                <label className="font-body text-sm font-medium text-foreground">Mín. Pedido</label>
                <Input type="number" step="0.01" min="0" value={form.min_order_value} onChange={e => setForm(f => ({ ...f, min_order_value: Number(e.target.value) }))} className="font-body mt-1" />
              </div>
              <div>
                <label className="font-body text-sm font-medium text-foreground">Limite Uso</label>
                <Input type="number" min="0" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} className="font-body mt-1" placeholder="∞" />
              </div>
            </div>
            <div>
              <label className="font-body text-sm font-medium text-foreground">Expira em</label>
              <Input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} className="font-body mt-1" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 font-body text-sm cursor-pointer">
                <input type="checkbox" checked={form.first_purchase_only} onChange={e => setForm(f => ({ ...f, first_purchase_only: e.target.checked }))} className="rounded border-input" />
                Apenas primeira compra
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;
