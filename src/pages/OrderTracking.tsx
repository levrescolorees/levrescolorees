import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, Check, Truck, MapPin, Clock, XCircle, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ORDER_STATUS_LABELS } from '@/hooks/useOrders';
import { formatCurrency } from '@/data/products';
import { toast } from 'sonner';

interface TrackingOrder {
  order_number: number;
  status: string;
  total: number;
  payment_method: string;
  tracking_code: string | null;
  created_at: string;
  shipping_address: Record<string, string> | null;
  items: Array<{ product_name: string; variant_name: string | null; quantity: number; unit_price: number }>;
  history: Array<{ to_status: string; created_at: string; note: string | null }>;
}

const STATUS_STEPS = ['pendente', 'confirmado', 'preparando', 'enviado', 'entregue'];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pendente: <Clock className="w-5 h-5" />,
  confirmado: <Check className="w-5 h-5" />,
  preparando: <Package className="w-5 h-5" />,
  enviado: <Truck className="w-5 h-5" />,
  entregue: <MapPin className="w-5 h-5" />,
  cancelado: <XCircle className="w-5 h-5" />,
};

const OrderTracking = () => {
  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('');
  const [cpfLast4, setCpfLast4] = useState('');
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const num = parseInt(query.replace(/\D/g, ''), 10);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCpfLast4 = cpfLast4.replace(/\D/g, '').slice(0, 4);

    if (!num) return;
    if (!normalizedEmail && normalizedCpfLast4.length !== 4) {
      toast.error('Informe e-mail ou os 4 ultimos digitos do CPF.');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const payload: Record<string, string | number> = { order_number: num };
      if (normalizedEmail) payload.email = normalizedEmail;
      if (normalizedCpfLast4) payload.cpf_last4 = normalizedCpfLast4;

      const { data, error } = await supabase.functions.invoke('order-tracking', {
        body: payload,
      });

      if (error || !data?.order) {
        setOrder(null);
        return;
      }

      setOrder(data.order as TrackingOrder);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = order ? (order.status === 'cancelado' ? -1 : STATUS_STEPS.indexOf(order.status)) : -1;
  const isCancelled = order?.status === 'cancelado';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-20 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">Rastreie seu Pedido</h1>
          <p className="font-body text-muted-foreground">Informe o numero do pedido e um fator de validacao para consultar o status.</p>
        </motion.div>

        <div className="space-y-3 mb-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Numero do pedido (ex: 1001)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="pl-10 font-body"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <Input
              placeholder="E-mail usado no pedido"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="font-body"
            />
            <Input
              placeholder="ou CPF (4 ultimos)"
              value={cpfLast4}
              maxLength={4}
              onChange={e => setCpfLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="font-body"
            />
            <Button onClick={handleSearch} disabled={loading} className="bg-primary text-primary-foreground font-body">
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </div>

        {searched && !order && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="font-body text-muted-foreground">Nenhum pedido encontrado com os dados informados.</p>
          </motion.div>
        )}

        {order && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-card rounded-sm shadow-soft p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Pedido</p>
                <p className="font-display text-2xl font-bold text-foreground">#{order.order_number}</p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-body font-semibold ${
                  isCancelled ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                }`}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </span>
                <p className="font-display text-xl font-bold text-foreground mt-2">{formatCurrency(order.total)}</p>
              </div>
            </div>

            {!isCancelled && (
              <div className="bg-card rounded-sm shadow-soft p-6">
                <div className="flex items-center justify-between">
                  {STATUS_STEPS.map((step, i) => {
                    const isActive = i <= currentStepIndex;
                    const isCurrent = i === currentStepIndex;
                    return (
                      <div key={step} className="flex items-center flex-1 last:flex-initial">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            isCurrent ? 'bg-primary text-primary-foreground shadow-md' :
                            isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {STATUS_ICONS[step]}
                          </div>
                          <span className={`font-body text-[10px] mt-1.5 text-center ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                            {ORDER_STATUS_LABELS[step]}
                          </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 rounded-full ${i < currentStepIndex ? 'bg-primary/40' : 'bg-muted'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {order.tracking_code && (
              <div className="bg-card rounded-sm shadow-soft p-6">
                <h3 className="font-display text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" /> Codigo de Rastreio
                </h3>
                <p className="font-body text-sm text-foreground bg-muted/50 rounded-md px-4 py-2 font-mono">
                  {order.tracking_code}
                </p>
              </div>
            )}

            <div className="bg-card rounded-sm shadow-soft p-6">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Itens do Pedido</h3>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center font-body text-sm">
                    <div>
                      <span className="text-foreground">{item.product_name}</span>
                      {item.variant_name && <span className="text-muted-foreground text-xs ml-1">({item.variant_name})</span>}
                      <span className="text-muted-foreground text-xs ml-2">x{item.quantity}</span>
                    </div>
                    <span className="text-foreground font-semibold">{formatCurrency(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {order.history.length > 0 && (
              <div className="bg-card rounded-sm shadow-soft p-6">
                <h3 className="font-display text-sm font-semibold text-foreground mb-4">Historico</h3>
                <div className="space-y-4">
                  {order.history.map((h, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" />
                        {i < order.history.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="font-body text-sm text-foreground font-medium flex items-center gap-1">
                          {ORDER_STATUS_LABELS[h.to_status] || h.to_status}
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground text-xs font-normal">
                            {new Date(h.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                        {h.note && <p className="font-body text-xs text-muted-foreground mt-0.5">{h.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default OrderTracking;
