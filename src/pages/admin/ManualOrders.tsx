import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { STATUS_LABEL, brl, openAttachment, ManualOrderStatus } from '@/lib/manualOrders';

const ManualOrders = () => {
  const { data = [], isLoading } = useQuery({
    queryKey: ['manual-orders', 'list'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('manual_orders')
        .select('id, order_number, status, total, created_at, attachment_path, customers(name, company_name)')
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data as any[];
    },
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Pedidos Manuais</h1>
        <Button asChild><Link to="/admin/pedidos-manuais/novo"><Plus className="w-4 h-4 mr-1" />Novo pedido</Link></Button>
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div> :
        <Table><TableHeader><TableRow>
          <TableHead>#</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead />
        </TableRow></TableHeader>
        <TableBody>
          {!data.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum pedido ainda.</TableCell></TableRow>}
          {data.map(o => (
            <TableRow key={o.id}>
              <TableCell className="font-medium">#{o.order_number}</TableCell>
              <TableCell>{o.customers?.name}{o.customers?.company_name ? ` — ${o.customers.company_name}` : ''}</TableCell>
              <TableCell>{new Date(o.created_at).toLocaleString('pt-BR')}</TableCell>
              <TableCell>{brl(o.total)}</TableCell>
              <TableCell><Badge variant={o.status === 'despachado' ? 'default' : 'secondary'}>{STATUS_LABEL[o.status as ManualOrderStatus]}</Badge></TableCell>
              <TableCell><Button variant="ghost" size="sm" onClick={() => openAttachment(o.attachment_path).catch(e => toast.error(e.message))}><FileText className="w-4 h-4" /></Button></TableCell>
            </TableRow>))}
        </TableBody></Table>}
      </CardContent></Card>
    </div>
  );
};
export default ManualOrders;
