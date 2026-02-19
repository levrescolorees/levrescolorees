import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, CreditCard, QrCode, FileText, Check, Tag } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { getSmartPrice, formatCurrency } from '@/data/products';
import { useCreateOrder } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type PaymentMethod = 'pix' | 'cartao' | 'boleto';

const Checkout = () => {
  const { items, totalSmart, totalSavings, clearCart } = useCart();
  const createOrder = useCreateOrder();
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [isWholesale, setIsWholesale] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [zip, setZip] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: string; discount_value: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .single();
      if (error || !data) { toast.error('Cupom inválido ou expirado.'); setAppliedCoupon(null); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { toast.error('Cupom expirado.'); return; }
      if (data.max_uses && data.used_count >= data.max_uses) { toast.error('Cupom esgotado.'); return; }
      if (data.min_order_value > 0 && totalSmart < data.min_order_value) {
        toast.error(`Pedido mínimo de R$ ${data.min_order_value.toFixed(2)} para este cupom.`);
        return;
      }
      setAppliedCoupon({ code: data.code, discount_type: data.discount_type, discount_value: data.discount_value });
      toast.success(`Cupom "${data.code}" aplicado!`);
    } finally {
      setCouponLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center max-w-lg">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-3">Pedido Confirmado!</h1>
            <p className="font-body text-muted-foreground mb-8">
              Obrigada pela sua compra. Você receberá os detalhes por e-mail em instantes.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-8 py-4 rounded-sm shadow-rose"
            >
              Voltar à Loja
            </Link>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <p className="font-body text-muted-foreground mb-4">Seu carrinho está vazio.</p>
          <Link to="/colecoes" className="text-primary underline font-body">Voltar às Coleções</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const shipping = totalSmart >= 299 ? 0 : 19.90;
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? totalSmart * (appliedCoupon.discount_value / 100)
      : appliedCoupon.discount_value
    : 0;
  const afterCoupon = totalSmart - couponDiscount + shipping;
  const pixDiscount = payment === 'pix' ? afterCoupon * 0.05 : 0;
  const finalTotal = afterCoupon - pixDiscount;

  const handleSubmit = async () => {
    if (!name || !email || !phone || !cpf || !street || !number || !city || !state || !zip) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      await createOrder.mutateAsync({
        customer: {
          name, email, phone, cpf,
          cnpj: isWholesale ? cnpj : null,
          company_name: isWholesale ? companyName : null,
          is_reseller: isWholesale,
        },
        items: items.map(item => {
          const smart = getSmartPrice(item.product.retailPrice, item.product.box06Price, item.product.box12Price, item.quantity);
          return {
            product_id: item.product.id,
            variant_id: null,
            product_name: item.product.name,
            variant_name: item.selectedColor || null,
            quantity: item.quantity,
            unit_price: smart.price,
          };
        }),
        subtotal: totalSmart,
        shipping,
        discount: couponDiscount + pixDiscount,
        total: finalTotal,
        payment_method: payment,
        shipping_address: { zip, street, number, complement, neighborhood, city, state },
      });

      clearCart();
      setSubmitted(true);
    } catch {
      toast.error('Erro ao processar pedido. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-16">
        <Link to="/carrinho" className="inline-flex items-center gap-1 text-sm font-body text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Carrinho
        </Link>

        <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form — 3 cols */}
          <div className="lg:col-span-3 space-y-8">
            {/* Personal */}
            <section className="bg-card rounded-sm shadow-soft p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Dados Pessoais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input placeholder="Nome completo *" value={name} onChange={e => setName(e.target.value)} className="font-body" />
                <Input placeholder="E-mail *" type="email" value={email} onChange={e => setEmail(e.target.value)} className="font-body" />
                <Input placeholder="Telefone / WhatsApp *" value={phone} onChange={e => setPhone(e.target.value)} className="font-body" />
                <Input placeholder="CPF *" value={cpf} onChange={e => setCpf(e.target.value)} className="font-body" />
              </div>

              <button
                onClick={() => setIsWholesale(!isWholesale)}
                className={`flex items-center gap-2 text-sm font-body transition-colors ${isWholesale ? 'text-primary font-semibold' : 'text-muted-foreground'}`}
              >
                <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-colors ${isWholesale ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                  {isWholesale && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                Compra para revenda / CNPJ
              </button>

              {isWholesale && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="CNPJ" value={cnpj} onChange={e => setCnpj(e.target.value)} className="font-body" />
                  <Input placeholder="Razão Social" value={companyName} onChange={e => setCompanyName(e.target.value)} className="font-body" />
                </motion.div>
              )}
            </section>

            {/* Address */}
            <section className="bg-card rounded-sm shadow-soft p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Endereço de Entrega</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input placeholder="CEP *" value={zip} onChange={e => setZip(e.target.value)} className="font-body md:col-span-1" />
                <Input placeholder="Rua / Avenida *" value={street} onChange={e => setStreet(e.target.value)} className="font-body md:col-span-2" />
                <Input placeholder="Número *" value={number} onChange={e => setNumber(e.target.value)} className="font-body" />
                <Input placeholder="Complemento" value={complement} onChange={e => setComplement(e.target.value)} className="font-body" />
                <Input placeholder="Bairro" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="font-body" />
                <Input placeholder="Cidade *" value={city} onChange={e => setCity(e.target.value)} className="font-body md:col-span-2" />
                <Input placeholder="Estado *" value={state} onChange={e => setState(e.target.value)} className="font-body" />
              </div>
            </section>

            {/* Payment */}
            <section className="bg-card rounded-sm shadow-soft p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Pagamento</h2>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: 'pix' as const, label: 'Pix', icon: QrCode, extra: '5% off' },
                  { id: 'cartao' as const, label: 'Cartão', icon: CreditCard, extra: 'Até 12x' },
                  { id: 'boleto' as const, label: 'Boleto', icon: FileText, extra: '3 dias úteis' },
                ]).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPayment(m.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-sm border-2 transition-all ${
                      payment === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <m.icon className={`w-5 h-5 ${payment === m.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-body text-sm font-semibold text-foreground">{m.label}</span>
                    <span className="font-body text-[10px] text-muted-foreground">{m.extra}</span>
                  </button>
                ))}
              </div>

              {payment === 'cartao' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Input placeholder="Número do cartão" className="font-body md:col-span-2" />
                  <Input placeholder="Nome no cartão" className="font-body" />
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Validade" className="font-body" />
                    <Input placeholder="CVV" className="font-body" />
                  </div>
                </motion.div>
              )}
            </section>
          </div>

          {/* Summary — 2 cols */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-sm shadow-soft p-6 space-y-4 sticky top-28">
              <h2 className="font-display text-lg font-semibold text-foreground">Resumo</h2>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {items.map(item => {
                  const smart = getSmartPrice(item.product.retailPrice, item.product.box06Price, item.product.box12Price, item.quantity);
                  return (
                    <div key={`${item.product.id}-${item.selectedColor}`} className="flex justify-between items-center text-sm font-body">
                      <div className="min-w-0">
                        <span className="text-foreground font-medium truncate block">{item.product.name}</span>
                        <span className="text-muted-foreground text-xs">{item.quantity}x {formatCurrency(smart.price)}</span>
                      </div>
                      <span className="text-foreground font-semibold ml-4">{formatCurrency(smart.price * item.quantity)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Field */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cupom de desconto"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    className="pl-9 font-body uppercase"
                    disabled={!!appliedCoupon}
                  />
                </div>
                {appliedCoupon ? (
                  <Button variant="outline" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="font-body text-xs">Remover</Button>
                ) : (
                  <Button variant="outline" onClick={applyCoupon} disabled={couponLoading} className="font-body text-xs">Aplicar</Button>
                )}
              </div>

              <div className="border-t border-border pt-3 space-y-2 font-body text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totalSmart)}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-primary font-medium">
                    <span>Economia</span>
                    <span>-{formatCurrency(totalSavings)}</span>
                  </div>
                )}
                {appliedCoupon && couponDiscount > 0 && (
                  <div className="flex justify-between text-primary font-medium">
                    <span>Cupom ({appliedCoupon.code})</span>
                    <span>-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Frete</span>
                  <span>{shipping === 0 ? <span className="text-primary font-medium">Grátis</span> : formatCurrency(shipping)}</span>
                </div>
                {payment === 'pix' && (
                  <div className="flex justify-between text-primary font-medium">
                    <span>Desconto Pix (5%)</span>
                    <span>-{formatCurrency(pixDiscount)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3 flex justify-between font-body">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-display text-xl font-bold text-foreground">
                  {formatCurrency(finalTotal)}
                </span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={createOrder.isPending}
                className="w-full bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-6 py-4 rounded-sm hover:opacity-90 transition-opacity shadow-rose disabled:opacity-50"
              >
                {createOrder.isPending ? 'Processando...' : 'Confirmar Pedido'}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs font-body text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Compra 100% segura e criptografada
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
