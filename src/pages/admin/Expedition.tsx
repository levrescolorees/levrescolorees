import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight, Undo2, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { STATUS_LABEL, NEXT_STATUS, openAttachment, brl, ManualOrderStatus } from '@/lib/manualOrders';

const COLUMNS: ManualOrderStatus[] = ['recebido', 'em_separacao', 'despachado'];
const PREV: Record<ManualOrderStatus, ManualOrderStatus | null> = { recebido: null, em_separacao: 'recebido', despachado: 'em_separacao' };
const ACTION: Record<ManualOrderStatus, string> = { recebido: 'Iniciar separação', em_separacao: 'Marcar despachado', despachado: '' };

const ago = (d: string) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
};

const Expedition = () => {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['manual-orders', 'expedition'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const { data, error } = await (supabase as any).from('manual_orders')
        .select('id, order_number, status, total, notes, created_at, updated_at, attachment_path, attachment_name, customers(name, company_name, phone), manual_order_items(id, product_name, variant_name, quantity)')
        .or(`status.neq.despachado,updated_at.gte.${since}`)
        .order('created_at', { ascending: true }).limit(500);
      if (error) throw error;
      return data as any[];
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`manual-orders-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_orders' }, () => qc.invalidateQueries({ queryKey: ['manual-orders'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const setStatus = async (id: string, status: ManualOrderStatus) => {
    setBusy(id);
    const { error } = await (supabase as any).rpc('set_manual_order_status', { p_order_id: id, p_status: status });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Pedido movido para ${STATUS_LABEL[status]}`);
    qc.invalidateQueries({ queryKey: ['manual-orders'] });
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Expedição</h1>
      <div className="grid md:grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const list = data.filter(o => o.status === col);
          return (
            <div key={col} className="bg-muted/50 rounded-lg p-3 space-y-3 min-h-[200px]">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-semibold text-sm">{STATUS_LABEL[col]}</h2>
                <span className="text-xs bg-background rounded-full px-2 py-0.5">{list.length}</span>
              </div>
              {list.map(o => {
                const next = NEXT_STATUS[col];
                return (
                  <Card key={o.id}>
                    <CardHeader className="p-3 pb-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold">#{o.order_number}</div>
                          <div className="text-sm">{o.customers?.name}{o.customers?.company_name ? ` — ${o.customers.company_name}` : ''}</div>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{ago(o.created_at)}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-1 space-y-2">
                      <ul className="text-xs space-y-0.5">
                        {o.manual_order_items.map((i: any) => <li key={i.id}><b>{i.quantity}×</b> {i.product_name}{i.variant_name ? ` — ${i.variant_name}` : ''}</li>)}
                      </ul>
                      {o.notes && <p className="text-xs bg-accent/40 rounded p-2 whitespace-pre-wrap">{o.notes}</p>}
                      <div className="text-xs text-muted-foreground">Total {brl(o.total)}</div>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => openAttachment(o.attachment_path).catch(e => toast.error(e.message))}>
                        <FileText className="w-4 h-4 mr-1" />Abrir pedido de compra
                      </Button>
                      <div className="flex gap-2">
                        {isAdmin && PREV[col] && <Button variant="ghost" size="sm" disabled={busy === o.id} onClick={() => setStatus(o.id, PREV[col]!)}><Undo2 className="w-4 h-4" /></Button>}
                        {next && <Button size="sm" className="flex-1" disabled={busy === o.id} onClick={() => setStatus(o.id, next)}>
                          {busy === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{ACTION[col]}<ArrowRight className="w-4 h-4 ml-1" /></>}
                        </Button>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default Expedition;
