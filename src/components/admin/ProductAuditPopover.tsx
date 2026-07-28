import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency } from '@/hooks/useProducts';

interface Props {
  productId: string;
}

const ProductAuditPopover = ({ productId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'product-audit', productId],
    enabled: false,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, details, created_at')
        .eq('entity_type', 'product')
        .eq('entity_id', productId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Histórico de alterações"
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <History className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <p className="font-body text-xs font-semibold text-foreground mb-2">Histórico de alterações</p>
        <AuditList productId={productId} />
      </PopoverContent>
    </Popover>
  );
};

const AuditList = ({ productId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'product-audit', productId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, details, created_at')
        .eq('entity_type', 'product')
        .eq('entity_id', productId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <p className="font-body text-xs text-muted-foreground">Carregando…</p>;
  if (!data?.length) return <p className="font-body text-xs text-muted-foreground">Nenhuma alteração registrada.</p>;

  return (
    <ul className="space-y-2 max-h-64 overflow-y-auto">
      {data.map((log: any) => {
        const d = log.details || {};
        const isPrice = d.field === 'retail_price';
        const fmt = (v: number) => (isPrice ? formatCurrency(Number(v)) : String(v));
        return (
          <li key={log.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
            <p className="font-body text-xs text-foreground">
              {isPrice ? 'Preço' : 'Estoque'}: <span className="text-muted-foreground line-through">{fmt(d.old_value)}</span>{' '}
              → <span className="font-semibold">{fmt(d.new_value)}</span>
            </p>
            <p className="font-body text-[10px] text-muted-foreground">
              {d.user_email || 'usuário desconhecido'} ·{' '}
              {new Date(log.created_at).toLocaleString('pt-BR')}
            </p>
          </li>
        );
      })}
    </ul>
  );
};

export default ProductAuditPopover;
