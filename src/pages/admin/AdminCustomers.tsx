import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { useAdminCustomers } from '@/hooks/useOrders';
import { Input } from '@/components/ui/input';

const AdminCustomers = () => {
  const { data: customers, isLoading } = useAdminCustomers();
  const [search, setSearch] = useState('');

  const filtered = customers?.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.cpf.includes(q);
  }) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Clientes</h1>
        <span className="font-body text-sm text-muted-foreground flex items-center gap-1">
          <Users className="w-4 h-4" /> {customers?.length ?? 0} total
        </span>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, email ou CPF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 font-body" />
      </div>

      <div className="bg-card rounded-lg shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">CPF</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desde</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">Nenhum cliente encontrado.</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-body text-sm font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{c.phone || '—'}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{c.cpf || '—'}</td>
                  <td className="px-4 py-3">
                    {c.is_reseller ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-body font-medium bg-primary/10 text-primary">Revendedor</span>
                    ) : (
                      <span className="font-body text-xs text-muted-foreground">Consumidor</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
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

export default AdminCustomers;
