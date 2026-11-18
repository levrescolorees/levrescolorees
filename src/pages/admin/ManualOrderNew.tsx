import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Upload, Loader2, FileText } from 'lucide-react';
import { brl, validateAttachment, attachmentPath, fetchMyTenantId } from '@/lib/manualOrders';

const db = supabase as any;

interface Line { key: string; product_id: string; variant_id: string; quantity: number; unit_price: number }

const ManualOrderNew = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [newProd, setNewProd] = useState<null | { name: string; sku: string; price: string; forLine?: string }>(null);
  const [newCust, setNewCust] = useState<null | { name: string; email: string; phone: string; cpf: string }>(null);

  const { data: customers = [], isFetching: searchingCust } = useQuery({
    queryKey: ['mo-customers', customerSearch.trim()],
    enabled: customerSearch.trim().length >= 2,
    queryFn: async () => {
      const term = customerSearch.trim().replace(/[,()%*]/g, ' ').trim();
      const digits = term.replace(/\D/g, '');
      const ors = [`name.ilike.*${term}*`, `email.ilike.*${term}*`, `company_name.ilike.*${term}*`, `cpf.ilike.*${term}*`, `cnpj.ilike.*${term}*`];
      if (digits.length >= 3 && digits !== term) {
        const fuzzy = digits.split('').join('*');
        ors.push(`cpf.ilike.*${fuzzy}*`, `cnpj.ilike.*${fuzzy}*`, `phone.ilike.*${fuzzy}*`);
      }
      const { data, error } = await db.from('customers')
        .select('id, name, email, company_name, cpf, cnpj, tenant_id').or(ors.join(',')).order('name').limit(20);
      if (error) throw error;
      return data as any[];
    },
  });
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: products = [] } = useQuery({
    queryKey: ['mo-products'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.from('products')
        .select('id, name, retail_price, product_variants(id, name, price_override, sort_order)')
        .order('name').limit(1000);
      if (error) throw error;
      return data as any[];
    },
  });
  const pmap = useMemo(() => Object.fromEntries(products.map((p: any) => [p.id, p])), [products]);

  const addLine = () => setLines(l => [...l, { key: crypto.randomUUID(), product_id: '', variant_id: '', quantity: 1, unit_price: 0 }]);
  const upd = (key: string, patch: Partial<Line>) => setLines(l => l.map(x => x.key === key ? { ...x, ...patch } : x));
  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    const err = validateAttachment(f);
    if (err) { toast.error(err); return; }
    setFile(f);
  };

  const createCustomer = async () => {
    if (!newCust?.name || !newCust.email) { toast.error('Nome e e-mail obrigatórios'); return; }
    const tenant_id = await fetchMyTenantId();
    const { data, error } = await db.from('customers').insert({ ...newCust, ...(tenant_id ? { tenant_id } : {}) }).select('id, tenant_id').single();
    if (error) { toast.error(error.message); return; }
    setCustomerId(data.id); setSelectedCustomer({ id: data.id, tenant_id: data.tenant_id, ...newCust }); setNewCust(null);
    qc.invalidateQueries({ queryKey: ['mo-customers'] });
    toast.success('Cliente cadastrado');
  };

  const createProduct = async () => {
    const name = newProd?.name.trim();
    const price = parseFloat((newProd?.price || '0').replace(',', '.')) || 0;
    if (!name) { toast.error('Informe o nome do produto'); return; }
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6);
    const { data, error } = await db.from('products')
      .insert({ name, slug, sku: newProd!.sku.trim() || null, retail_price: price })
      .select('id, name, retail_price').single();
    if (error) { toast.error(error.message); return; }
    qc.setQueryData(['mo-products'], (old: any[] = []) => [...old, { ...data, product_variants: [] }].sort((a, b) => a.name.localeCompare(b.name)));
    qc.invalidateQueries({ queryKey: ['admin'] });
    const line = { key: crypto.randomUUID(), product_id: data.id, variant_id: '', quantity: 1, unit_price: price };
    setLines(l => newProd!.forLine ? l.map(x => x.key === newProd!.forLine ? { ...x, product_id: data.id, variant_id: '', unit_price: price } : x) : [...l, line]);
    setNewProd(null);
    toast.success('Produto cadastrado e salvo em Produtos');
  };

  const submit = async () => {
    if (!customerId) return toast.error('Selecione o cliente');
    if (!lines.length || lines.some(l => !l.product_id || l.quantity <= 0)) return toast.error('Revise os itens');
    if (!file) return toast.error('Anexe o pedido de compra');
    setSaving(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    try {
      const tenantId = selectedCustomer?.tenant_id || await fetchMyTenantId();
      if (!tenantId) throw new Error('Seu usuário não está vinculado a uma filial');
      const path = attachmentPath(tenantId, ext);
      const up = await supabase.storage.from('purchase-orders').upload(path, file, { contentType: file.type || undefined });
      if (up.error) throw up.error;
      const { error } = await db.rpc('create_manual_order', {
        p_customer_id: customerId,
        p_items: lines.map(l => ({ product_id: l.product_id, variant_id: l.variant_id || null, quantity: l.quantity, unit_price: l.unit_price })),
        p_attachment_path: path, p_attachment_name: file.name, p_notes: notes,
      });
      if (error) { await supabase.storage.from('purchase-orders').remove([path]); throw error; }
      toast.success('Pedido enviado para a expedição');
      qc.invalidateQueries({ queryKey: ['manual-orders'] });
      navigate('/admin/pedidos-manuais');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/pedidos-manuais')}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="font-display text-2xl font-bold">Novo Pedido Manual</h1>
      </div>

      <Card><CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-md border border-primary bg-primary/5 p-3">
              <div className="text-sm">
                <div className="font-medium">{selectedCustomer.name}{selectedCustomer.company_name ? ` — ${selectedCustomer.company_name}` : ''}</div>
                <div className="text-muted-foreground">{selectedCustomer.email} · {selectedCustomer.cnpj || selectedCustomer.cpf || 'sem documento'}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomer(null); setCustomerId(''); }}>Trocar</Button>
            </div>
          ) : (<>
            <div className="flex gap-2">
              <Input autoFocus placeholder="Buscar por nome, e-mail, CPF, CNPJ ou empresa" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
              <Button variant="outline" onClick={() => setNewCust({ name: customerSearch, email: '', phone: '', cpf: '' })}><Plus className="w-4 h-4 mr-1" />Novo</Button>
            </div>
            {customerSearch.trim().length >= 2 && (
              <div className="rounded-md border border-border divide-y divide-border max-h-64 overflow-auto">
                {searchingCust && <div className="p-3 text-sm text-muted-foreground">Buscando...</div>}
                {!searchingCust && !customers.length && <div className="p-3 text-sm text-muted-foreground">Nenhum cliente encontrado. Use "Novo" para cadastrar.</div>}
                {customers.map((c: any) => (
                  <button key={c.id} type="button" className="w-full text-left p-3 hover:bg-muted text-sm"
                    onClick={() => { setSelectedCustomer(c); setCustomerId(c.id); }}>
                    <div className="font-medium">{c.name}{c.company_name ? ` — ${c.company_name}` : ''}</div>
                    <div className="text-muted-foreground text-xs">{c.email} · {c.cnpj || c.cpf || 'sem documento'}</div>
                  </button>
                ))}
              </div>
            )}
          </>)}
        </CardContent>
      </Card>

      <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Itens</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setNewProd({ name: '', sku: '', price: '' })}><Plus className="w-4 h-4 mr-1" />Novo produto</Button>
            <Button size="sm" onClick={addLine}><Plus className="w-4 h-4 mr-1" />Adicionar item</Button></div></CardHeader>
        <CardContent className="space-y-3">
          {!lines.length && <p className="text-sm text-muted-foreground">Nenhum item adicionado.</p>}
          {lines.map(l => {
            const p = pmap[l.product_id];
            const variants = (p?.product_variants ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
            return (
              <div key={l.key} className="grid grid-cols-12 gap-2 items-end border-b border-border pb-3">
                <div className="col-span-12 md:col-span-4"><Label className="text-xs">Produto</Label>
                  <Select value={l.product_id} onValueChange={v => upd(l.key, { product_id: v, variant_id: '', unit_price: Number(pmap[v]?.retail_price ?? 0) })}>
                    <SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger>
                    <SelectContent>{products.map((x: any) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="col-span-12 md:col-span-3"><Label className="text-xs">Variação</Label>
                  <Select value={l.variant_id} disabled={!variants.length} onValueChange={v => {
                    const vv = variants.find((x: any) => x.id === v);
                    upd(l.key, { variant_id: v, unit_price: Number(vv?.price_override ?? p?.retail_price ?? 0) });
                  }}>
                    <SelectTrigger><SelectValue placeholder={variants.length ? 'Variação' : '—'} /></SelectTrigger>
                    <SelectContent>{variants.map((x: any) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="col-span-4 md:col-span-1"><Label className="text-xs">Qtd</Label>
                  <Input type="number" min={1} value={l.quantity} onChange={e => upd(l.key, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} /></div>
                <div className="col-span-5 md:col-span-2"><Label className="text-xs">Preço un.</Label>
                  <Input type="number" min={0} step="0.01" value={l.unit_price} onChange={e => upd(l.key, { unit_price: Math.max(0, parseFloat(e.target.value) || 0) })} /></div>
                <div className="col-span-3 md:col-span-2 flex items-center justify-between gap-1">
                  <span className="text-sm font-medium">{brl(l.quantity * l.unit_price)}</span>
                  <Button variant="ghost" size="icon" onClick={() => setLines(x => x.filter(y => y.key !== l.key))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            );
          })}
          {!!lines.length && <div className="text-right font-semibold">Total: {brl(total)}</div>}
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="text-base">Pedido de Compra do cliente *</CardTitle></CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/50"
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
            {file ? <><FileText className="w-6 h-6 text-primary" /><span className="text-sm">{file.name}</span></>
              : <><Upload className="w-6 h-6 text-muted-foreground" /><span className="text-sm text-muted-foreground">Clique ou arraste PDF, DOC ou DOCX (até 10MB)</span></>}
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
          </label>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="text-base">Observações logísticas</CardTitle></CardHeader>
        <CardContent><Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex.: embalar separado, etiqueta do cliente, prazo..." /></CardContent>
      </Card>

      <div className="flex justify-end"><Button size="lg" onClick={submit} disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enviar para expedição</Button></div>

      <Dialog open={!!newProd} onOpenChange={o => !o && setNewProd(null)}>
        <DialogContent><DialogHeader><DialogTitle>Cadastrar novo produto</DialogTitle></DialogHeader>
          {newProd && <div className="space-y-3">
            <div><Label>Nome *</Label><Input autoFocus value={newProd.name} onChange={e => setNewProd({ ...newProd, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU</Label><Input value={newProd.sku} onChange={e => setNewProd({ ...newProd, sku: e.target.value })} /></div>
              <div><Label>Preço de venda</Label><Input inputMode="decimal" placeholder="0,00" value={newProd.price} onChange={e => setNewProd({ ...newProd, price: e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">O produto fica salvo em Produtos. Fotos, variações e estoque podem ser completados depois.</p>
          </div>}
          <DialogFooter><Button onClick={createProduct}>Cadastrar e adicionar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newCust} onOpenChange={o => !o && setNewCust(null)}>
        <DialogContent><DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
          {newCust && <div className="space-y-3">
            {(['name', 'email', 'phone', 'cpf'] as const).map(k => (
              <div key={k}><Label>{{ name: 'Nome *', email: 'E-mail *', phone: 'Telefone', cpf: 'CPF/CNPJ' }[k]}</Label>
                <Input value={newCust[k]} onChange={e => setNewCust({ ...newCust, [k]: e.target.value })} /></div>))}
          </div>}
          <DialogFooter><Button onClick={createCustomer}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default ManualOrderNew;
