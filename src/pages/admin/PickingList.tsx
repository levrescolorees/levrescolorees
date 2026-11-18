import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePickingList } from '@/hooks/usePickingList';
import { pickingProgress, STATUS_LABEL, ManualOrderStatus } from '@/lib/manualOrders';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Printer, CheckCircle2, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PickingList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error } = usePickingList(id);
  const key = `picking:${id}`;
  const [checked, setChecked] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } });
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => { localStorage.setItem(key, JSON.stringify(checked)); }, [key, checked]);

  // Abrir a lista assume o pedido (Recebido → Em Separação)
  useEffect(() => {
    if (!data || started.current || data.status !== 'recebido') return;
    started.current = true;
    (supabase as any).rpc('set_manual_order_status', { p_order_id: data.id, p_status: 'em_separacao' }).then(({ error }: any) => {
      if (error) toast.error(error.message);
      else { toast.success('Pedido movido para Em Separação'); qc.invalidateQueries({ queryKey: ['manual-orders'] }); }
    });
  }, [data, qc]);

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (error || !data) return <div className="p-8 text-center text-muted-foreground">Pedido não encontrado.</div>;

  const items = data.items;
  const prog = pickingProgress(items.map(i => i.id), checked);
  const toggle = (itemId: string) => setChecked(c => c.includes(itemId) ? c.filter(x => x !== itemId) : [...c, itemId]);
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const c = data.customers ?? {};

  const finish = async () => {
    setBusy(true);
    const { error } = await (supabase as any).rpc('set_manual_order_status', { p_order_id: data.id, p_status: 'despachado' });
    setBusy(false);
    if (error) return toast.error(error.message);
    localStorage.removeItem(key);
    qc.invalidateQueries({ queryKey: ['manual-orders'] });
    toast.success(`Pedido #${data.order_number} despachado`);
    navigate('/admin/expedicao');
  };

  return (
    <div className="picking-sheet max-w-3xl mx-auto space-y-5 pb-32">
      <div className="no-print flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => navigate('/admin/expedicao')}><ArrowLeft className="w-4 h-4 mr-1" />Expedição</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" />Imprimir Romaneio</Button>
      </div>

      <header className="border-b-2 border-foreground pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Lista de Separação / Romaneio</p>
            <h1 className="font-display text-3xl font-bold">Pedido #{data.order_number}</h1>
          </div>
          <div className="text-right text-sm">
            <div>{new Date(data.created_at).toLocaleString('pt-BR')}</div>
            {data.tenants?.name && <div>Filial: <b>{data.tenants.name}</b></div>}
            <div className="no-print text-muted-foreground">{STATUS_LABEL[data.status as ManualOrderStatus]}</div>
          </div>
        </div>
      </header>

      <section className="text-sm grid sm:grid-cols-2 gap-1">
        <div><b>Cliente:</b> {c.name}{c.company_name ? ` — ${c.company_name}` : ''}</div>
        <div><b>Documento:</b> {c.cnpj || c.cpf || '—'}</div>
        <div><b>Telefone:</b> {c.phone || '—'}</div>
        <div><b>E-mail:</b> {c.email || '—'}</div>
      </section>

      {data.notes && <section className="border-2 border-dashed border-foreground/40 rounded p-3 text-base whitespace-pre-wrap"><b>Observações:</b> {data.notes}</section>}

      <div className="no-print sticky top-0 z-10 bg-background/95 backdrop-blur py-3 space-y-2">
        <div className="flex justify-between text-lg font-semibold"><span>{prog.done}/{prog.total} itens separados</span><span>{prog.percent}%</span></div>
        <Progress value={prog.percent} className="h-3" />
      </div>

      {/* Tela: checklist grande */}
      <ul className="no-print space-y-2">
        {items.map(i => {
          const on = checked.includes(i.id);
          return (
            <li key={i.id}>
              <button type="button" onClick={() => toggle(i.id)}
                className={cn('w-full flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-colors',
                  on ? 'border-primary bg-primary/10' : 'border-border bg-card')}>
                <span className={cn('shrink-0 w-10 h-10 rounded-md border-2 flex items-center justify-center',
                  on ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground')}>
                  {on && <Check className="w-7 h-7" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-mono text-muted-foreground">{i.sku || 'sem SKU'}</span>
                  <span className={cn('block text-lg font-medium', on && 'line-through opacity-60')}>{i.product_name}</span>
                  {i.variant_name && <span className="block text-base text-muted-foreground">{i.variant_name}</span>}
                </span>
                <span className="shrink-0 text-3xl font-bold tabular-nums">{i.quantity}<span className="text-sm font-normal ml-0.5">un</span></span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Impressão: tabela com quadradinhos */}
      <table className="print-only">
        <thead><tr><th style={{ width: 28 }}>✓</th><th>SKU</th><th>Produto</th><th>Variação</th><th style={{ width: 60 }}>Qtd</th></tr></thead>
        <tbody>
          {items.map(i => (
            <tr key={i.id}><td style={{ textAlign: 'center' }}><span className="pen-box" /></td><td>{i.sku || '—'}</td><td>{i.product_name}</td><td>{i.variant_name || '—'}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{i.quantity}</td></tr>
          ))}
          <tr><td colSpan={4} style={{ textAlign: 'right' }}><b>Total de unidades</b></td><td style={{ textAlign: 'right' }}><b>{totalUnits}</b></td></tr>
        </tbody>
      </table>
      <div className="print-only" style={{ marginTop: 32 }}>
        <p>Separado por: ______________________________ &nbsp; Data: ___/___/_____</p>
        <p style={{ marginTop: 16 }}>Conferido por: _____________________________ &nbsp; Volumes: ______</p>
      </div>

      {data.status !== 'despachado' && (
        <div className="no-print fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <Button size="lg" disabled={!prog.complete || busy} onClick={finish}
              className="w-full h-14 text-lg bg-success text-success-foreground hover:bg-success/90">
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-6 h-6 mr-2" />Concluir Separação (Mover para Despachado)</>}
            </Button>
            {!prog.complete && <p className="text-center text-xs text-muted-foreground mt-1">Marque todos os itens para concluir</p>}
          </div>
        </div>
      )}
    </div>
  );
};
export default PickingList;
