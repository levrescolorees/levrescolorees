import { Package, FolderOpen, ShoppingCart, TrendingUp } from 'lucide-react';
import { useAdminProducts, useCollections } from '@/hooks/useProducts';

const Dashboard = () => {
  const { data: products } = useAdminProducts();
  const { data: collections } = useCollections();

  const stats = [
    { label: 'Produtos', value: products?.length ?? 0, icon: Package, color: 'text-primary' },
    { label: 'Ativos', value: products?.filter(p => p.is_active).length ?? 0, icon: TrendingUp, color: 'text-accent' },
    { label: 'Coleções', value: collections?.length ?? 0, icon: FolderOpen, color: 'text-primary' },
    { label: 'Pedidos', value: 0, icon: ShoppingCart, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-lg p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
            <p className="font-body text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-lg p-6 shadow-soft">
        <h2 className="font-body text-sm font-semibold text-foreground mb-2">Próximos Passos</h2>
        <ul className="font-body text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Gerencie seus produtos na aba Produtos</li>
          <li>Sistema de pedidos será implementado na Fase 2</li>
          <li>Cupons e frete na Fase 3</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
