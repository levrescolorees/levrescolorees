import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Search, Download } from 'lucide-react';
import { useAdminOrders, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/hooks/useOrders';
import { formatCurrency } from '@/hooks/useProducts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];

const AdminOrders = () => {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const { data: orders, isLoading } = useAdminOrders(statusFilter === 'all' ? undefined : statusFilter);

  const filtered = orders?.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.order_number?.toString().includes(q) ||
      o.customer?.name?.toLowerCase().includes(q) ||
      o.customer?.email?.toLowerCase().includes(q)
    );
  }) ?? [];

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Pedido', 'Data', 'Cliente', 'Email', 'Status', 'Total', 'Pagamento', 'Rastreio'];
    const rows = filtered.map(o => [
      `#${o.order_number}`,
      new Date(o.created_at).toLocaleDateString('pt-BR'),
      o.customer?.name || '',
      o.customer?.email || '',
      ORDER_STATUS_LABELS[o.status],
      o.total.toFixed(2),
      o.payment_method,
      o.tracking_code || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Pedidos</h1>
        <Button variant="outline" onClick={exportCSV} disabled={!filtered.length}>
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nº, nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 font-body" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pedido</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pagamento</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                <th className="text-right px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">Nenhum pedido encontrado.</td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-body text-sm font-medium text-foreground">#{o.order_number}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-body text-sm font-medium text-foreground">{o.customer?.name || '—'}</p>
                      <p className="font-body text-xs text-muted-foreground">{o.customer?.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-body font-medium ${ORDER_STATUS_COLORS[o.status]}`}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground capitalize">{o.payment_method}</td>
                  <td className="px-4 py-3 font-body text-sm font-semibold text-foreground">{formatCurrency(o.total)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/admin/pedidos/${o.id}`}><Eye className="w-4 h-4" /></Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
