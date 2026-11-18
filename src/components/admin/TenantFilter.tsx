import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenants } from '@/hooks/useTenants';
import { useAuth } from '@/hooks/useAuth';

export function TenantFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { role } = useAuth();
  const { data = [] } = useTenants();
  if (!['admin', 'operador', 'financeiro'].includes(role ?? '') || data.length < 2) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48"><SelectValue placeholder="Todas as filiais" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas as filiais</SelectItem>
        {data.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
