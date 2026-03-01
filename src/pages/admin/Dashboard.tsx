import { useMemo } from 'react';
import { Package, FolderOpen, ShoppingCart, TrendingUp, DollarSign, AlertTriangle, Clock, Users } from 'lucide-react';
import { useCollections } from '@/hooks/useProducts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const Dashboard = () => {
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['admin', 'dashboard-products'],
    staleTime: 60_000,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock, is_active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; name: string; stock: number; is_active: boolean }>;
    },
  });
  const { data: collections, isLoading: collectionsLoading } = useCollections();
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin', 'dashboard-orders'],
    staleTime: 30_000,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, total, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; status: string; total: number; created_at: string }>;
    },
  });
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['admin', 'customers-count'],
    staleTime: 60_000,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      const { count, error } = await supabase.from('customers').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const metrics = useMemo(() => {
    if (!orders) return { revenue: 0, avgTicket: 0, pending: 0, today: 0, weekRevenue: 0 };
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    const delivered = orders.filter((o: any) => o.status !== 'cancelado');
    const revenue = delivered.reduce((s: number, o: any) => s + Number(o.total), 0);
    const avgTicket = delivered.length ? revenue / delivered.length : 0;
    const pending = orders.filter((o: any) => o.status === 'pendente').length;
    const today = orders.filter((o: any) => o.created_at?.slice(0, 10) === todayStr).length;
    const weekRevenue = delivered
      .filter((o: any) => new Date(o.created_at) >= weekAgo)
      .reduce((s: number, o: any) => s + Number(o.total), 0);

    return { revenue, avgTicket, pending, today, weekRevenue };
  }, [orders]);

  // Low stock products
  const lowStock = useMemo(() => {
    if (!products) return [];
    return products.filter(p => p.stock <= 5 && p.is_active).slice(0, 5);
  }, [products]);

  // Orders by status for pie chart
  const statusData = useMemo(() => {
    if (!orders) return [];
    const counts: Record<string, number> = {};
    orders.forEach((o: any) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const STATUS_COLORS: Record<string, string> = {
    pendente: 'hsl(38, 60%, 55%)',
    confirmado: 'hsl(210, 60%, 55%)',
    preparando: 'hsl(280, 50%, 55%)',
    enviado: 'hsl(200, 70%, 50%)',
    entregue: 'hsl(140, 50%, 45%)',
    cancelado: 'hsl(0, 60%, 55%)',
  };

  // Revenue last 7 days chart
  const revenueByDay = useMemo(() => {
    if (!orders) return [];
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    orders.filter((o: any) => o.status !== 'cancelado').forEach((o: any) => {
      const d = o.created_at?.slice(0, 10);
      if (d && d in days) days[d] += Number(o.total);
    });
    return Object.entries(days).map(([date, value]) => ({
      date: date.slice(5).replace('-', '/'),
      value,
    }));
  }, [orders]);

  const cardDefs = [
    { label: 'Faturamento', value: formatCurrency(metrics.revenue), icon: DollarSign, color: 'text-primary', loading: ordersLoading },
    { label: 'Pedidos', value: orders?.length ?? 0, icon: ShoppingCart, color: 'text-accent', loading: ordersLoading },
    { label: 'Ticket Médio', value: formatCurrency(metrics.avgTicket), icon: TrendingUp, color: 'text-primary', loading: ordersLoading },
    { label: 'Pendentes', value: metrics.pending, icon: Clock, color: 'text-destructive', loading: ordersLoading },
    { label: 'Hoje', value: metrics.today, icon: ShoppingCart, color: 'text-accent', loading: ordersLoading },
    { label: 'Produtos', value: products?.length ?? 0, icon: Package, color: 'text-primary', loading: productsLoading },
    { label: 'Coleções', value: collections?.length ?? 0, icon: FolderOpen, color: 'text-muted-foreground', loading: collectionsLoading },
    { label: 'Clientes', value: customers ?? 0, icon: Users, color: 'text-accent', loading: customersLoading },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cardDefs.map(s => (
          <div key={s.label} className="bg-card rounded-lg p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            {s.loading && !s.value ? (
              <Skeleton className="h-8 w-24 mb-1" />
            ) : (
              <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
            )}
            <p className="font-body text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-card rounded-lg p-6 shadow-soft">
          <h2 className="font-body text-sm font-semibold text-foreground mb-4">Faturamento – Últimos 7 dias</h2>
          {ordersLoading && !orders ? (
            <Skeleton className="h-56 w-full rounded-lg" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByDay}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `R$${v}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={l => `Dia ${l}`} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status Pie */}
        <div className="bg-card rounded-lg p-6 shadow-soft">
          <h2 className="font-body text-sm font-semibold text-foreground mb-4">Pedidos por Status</h2>
          {ordersLoading && !orders ? (
            <Skeleton className="h-56 w-full rounded-lg" />
          ) : statusData.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground text-center py-8">Sem pedidos ainda.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                    {statusData.map(entry => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || 'hsl(var(--muted))'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <div className="bg-card rounded-lg p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="font-body text-sm font-semibold text-foreground">Estoque Baixo (≤ 5 unidades)</h2>
          </div>
          <div className="space-y-2">
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-destructive/5 rounded-md px-4 py-2">
                <span className="font-body text-sm text-foreground">{p.name}</span>
                <span className="font-body text-sm font-semibold text-destructive">{p.stock} un.</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
