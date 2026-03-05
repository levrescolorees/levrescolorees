import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, Truck, Clock, Tag, FileText, ExternalLink } from 'lucide-react';
import {
  useOrderDetail, useUpdateOrderStatus, useUpdateTracking, useGenerateShippingLabel,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
} from '@/hooks/useOrders';
import { formatCurrency } from '@/hooks/useProducts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrderDetail(id);
  const updateStatus = useUpdateOrderStatus();
  const updateTracking = useUpdateTracking();
  const generateLabel = useGenerateShippingLabel();
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [trackingCode, setTrackingCode] = useState('');

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!order) {
    return <div className="text-center py-20 font-body text-muted-foreground">Pedido não encontrado.</div>;
  }

  const handleStatusUpdate = () => {
    if (!newStatus) return;
    updateStatus.mutate(
      { orderId: order.id, fromStatus: order.status, toStatus: newStatus, note: statusNote || undefined },
      {
        onSuccess: () => {
          toast.success(`Status atualizado para ${ORDER_STATUS_LABELS[newStatus]}`);
          setNewStatus('');
          setStatusNote('');
        },
      }
    );
  };

  const handleTrackingUpdate = () => {
    if (!trackingCode.trim()) return;
    updateTracking.mutate(
      { orderId: order.id, trackingCode: trackingCode.trim() },
      { onSuccess: () => toast.success('Rastreio atualizado!') }
    );
  };

  const addr = order.shipping_address;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/admin/pedidos" className="inline-flex items-center gap-1 text-sm font-body text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Pedido #{order.order_number}</h1>
          <p className="font-body text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-body font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="bg-card rounded-lg shadow-soft p-5 space-y-3">
          <h2 className="font-body text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4" /> Cliente
          </h2>
          {order.customer ? (
            <div className="space-y-1 font-body text-sm">
              <p className="text-foreground font-medium">{order.customer.name}</p>
              <p className="text-muted-foreground">{order.customer.email}</p>
              <p className="text-muted-foreground">{order.customer.phone}</p>
              <p className="text-muted-foreground">CPF: {order.customer.cpf}</p>
              {order.customer.cnpj && <p className="text-muted-foreground">CNPJ: {order.customer.cnpj}</p>}
            </div>
          ) : (
            <p className="font-body text-sm text-muted-foreground">Sem dados do cliente.</p>
          )}
        </div>

        {/* Address */}
        <div className="bg-card rounded-lg shadow-soft p-5 space-y-3">
          <h2 className="font-body text-sm font-semibold text-foreground flex items-center gap-2">
            <Truck className="w-4 h-4" /> Endereço
          </h2>
          {addr ? (
            <div className="font-body text-sm text-muted-foreground space-y-1">
              <p>{addr.street}, {addr.number}{addr.complement ? ` - ${addr.complement}` : ''}</p>
              <p>{addr.neighborhood} - {addr.city}/{addr.state}</p>
              <p>CEP: {addr.zip}</p>
            </div>
          ) : (
            <p className="font-body text-sm text-muted-foreground">Sem endereço.</p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-card rounded-lg shadow-soft overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="font-body text-sm font-semibold text-foreground">Itens do Pedido</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-2 font-body text-xs text-muted-foreground uppercase">Produto</th>
              <th className="text-left px-4 py-2 font-body text-xs text-muted-foreground uppercase">Variante</th>
              <th className="text-center px-4 py-2 font-body text-xs text-muted-foreground uppercase">Qtd</th>
              <th className="text-right px-4 py-2 font-body text-xs text-muted-foreground uppercase">Unitário</th>
              <th className="text-right px-4 py-2 font-body text-xs text-muted-foreground uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map(item => (
              <tr key={item.id} className="border-b border-border">
                <td className="px-4 py-3 font-body text-sm text-foreground">{item.product_name}</td>
                <td className="px-4 py-3 font-body text-sm text-muted-foreground">{item.variant_name || '—'}</td>
                <td className="px-4 py-3 font-body text-sm text-center text-foreground">{item.quantity}</td>
                <td className="px-4 py-3 font-body text-sm text-right text-foreground">{formatCurrency(item.unit_price)}</td>
                <td className="px-4 py-3 font-body text-sm text-right font-semibold text-foreground">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 border-t border-border space-y-1 text-right font-body text-sm">
          <p className="text-muted-foreground">Subtotal: {formatCurrency(order.subtotal)}</p>
          <p className="text-muted-foreground">Frete: {formatCurrency(order.shipping)}</p>
          {order.discount > 0 && <p className="text-primary">Desconto: -{formatCurrency(order.discount)}</p>}
          <p className="text-foreground font-bold text-base">Total: {formatCurrency(order.total)}</p>
          <p className="text-muted-foreground text-xs capitalize">Pagamento: {order.payment_method}</p>
        </div>
      </div>

      {/* Actions: Update Status + Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg shadow-soft p-5 space-y-3">
          <h2 className="font-body text-sm font-semibold text-foreground">Atualizar Status</h2>
          <Select value={newStatus} onValueChange={v => setNewStatus(v as OrderStatus)}>
            <SelectTrigger><SelectValue placeholder="Selecione o novo status" /></SelectTrigger>
            <SelectContent>
              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} disabled={k === order.status}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Observação (opcional)"
            value={statusNote}
            onChange={e => setStatusNote(e.target.value)}
            className="font-body"
            rows={2}
          />
          <Button onClick={handleStatusUpdate} disabled={!newStatus || updateStatus.isPending} className="w-full">
            {updateStatus.isPending ? 'Atualizando...' : 'Atualizar Status'}
          </Button>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-5 space-y-3">
          <h2 className="font-body text-sm font-semibold text-foreground">Rastreio</h2>
          <Input
            placeholder="Código de rastreio"
            value={trackingCode || order.tracking_code || ''}
            onChange={e => setTrackingCode(e.target.value)}
            className="font-body"
          />
          <Button onClick={handleTrackingUpdate} disabled={updateTracking.isPending} variant="outline" className="w-full">
            {updateTracking.isPending ? 'Salvando...' : 'Salvar Rastreio'}
          </Button>
        </div>
      </div>

      {/* Shipping Label */}
      <div className="bg-card rounded-lg shadow-soft p-5 space-y-3">
        <h2 className="font-body text-sm font-semibold text-foreground flex items-center gap-2">
          <Tag className="w-4 h-4" /> Etiqueta de Envio
        </h2>
        {order.shipping_method && (
          <p className="font-body text-sm text-muted-foreground">
            Serviço selecionado: <span className="font-medium text-foreground">{order.shipping_method}</span>
          </p>
        )}
        {order.shipping_label ? (
          <div className="space-y-2">
            <p className="font-body text-sm text-muted-foreground">
              Status: <span className="font-medium text-foreground">{(order.shipping_label as any).status || 'gerada'}</span>
            </p>
            {(order.shipping_label as any).tracking_code && (
              <p className="font-body text-sm text-muted-foreground">
                Rastreio: <span className="font-medium text-foreground">{(order.shipping_label as any).tracking_code}</span>
              </p>
            )}
            {(order.shipping_label as any).label_url && (
              <Button variant="outline" asChild className="w-full">
                <a href={(order.shipping_label as any).label_url} target="_blank" rel="noopener noreferrer">
                  <FileText className="w-4 h-4 mr-2" /> Baixar Etiqueta (PDF) <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            )}
          </div>
        ) : (
          <Button
            onClick={() => {
              generateLabel.mutate(order.id, {
                onSuccess: (data) => {
                  toast.success('Etiqueta gerada com sucesso!');
                  if (data?.label?.tracking_code) {
                    setTrackingCode(data.label.tracking_code);
                  }
                },
                onError: (err: any) => {
                  toast.error(err?.message || 'Erro ao gerar etiqueta');
                },
              });
            }}
            disabled={generateLabel.isPending || !['confirmado', 'preparando'].includes(order.status)}
            className="w-full"
          >
            {generateLabel.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando...</>
            ) : (
              <><FileText className="w-4 h-4 mr-2" /> Gerar Etiqueta SuperFrete</>
            )}
          </Button>
        )}
        {!['confirmado', 'preparando'].includes(order.status) && !order.shipping_label && (
          <p className="font-body text-xs text-muted-foreground">
            Disponível quando o pedido estiver confirmado ou preparando.
          </p>
        )}
      </div>

      {/* Status History */}
      {'statusHistory' in order && (order as any).statusHistory?.length > 0 && (
        <div className="bg-card rounded-lg shadow-soft p-5 space-y-3">
          <h2 className="font-body text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> Histórico
          </h2>
          <div className="space-y-2">
            {(order as any).statusHistory.map((h: any) => (
              <div key={h.id} className="flex items-start gap-3 font-body text-sm">
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  {new Date(h.created_at).toLocaleString('pt-BR')}
                </span>
                <div>
                  {h.from_status && (
                    <span className="text-muted-foreground">{ORDER_STATUS_LABELS[h.from_status]} → </span>
                  )}
                  <span className="font-medium text-foreground">{ORDER_STATUS_LABELS[h.to_status]}</span>
                  {h.note && <p className="text-muted-foreground text-xs mt-0.5">{h.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
