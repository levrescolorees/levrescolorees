import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, ShieldCheck, CreditCard, QrCode, FileText,
  Check, Tag, User, MapPin, Truck, Wallet, Copy, Loader2, Package,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { getSmartPrice, formatCurrency } from '@/data/products';
import { useShippingRules, useStoreSettings } from '@/hooks/useStoreSettings';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

type PaymentMethod = 'pix' | 'card' | 'boleto';

interface CheckoutForm {
  name: string; email: string; phone: string; cpf: string;
  cnpj: string; companyName: string; isWholesale: boolean;
  zip: string; street: string; number: string; complement: string;
  neighborhood: string; city: string; state: string;
  payment: PaymentMethod;
  couponCode: string;
}

const STEPS = [
  { id: 1, label: 'Dados', icon: User },
  { id: 2, label: 'Endereço', icon: MapPin },
  { id: 3, label: 'Entrega', icon: Truck },
  { id: 4, label: 'Pagamento', icon: Wallet },
];

// Masks
function maskCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function maskCNPJ(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}
function maskCEP(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

const Checkout = () => {
  const { items, totalSmart, totalSavings, clearCart } = useCart();
  const { data: shippingRules } = useShippingRules();
  const { data: storeSettings } = useStoreSettings();

  // MP config from store_settings
  const mpConfig = storeSettings?.mercado_pago as any;
  const mpPublicKey = mpConfig?.public_key || '';
  const mpCardEnabled = mpConfig?.card_enabled ?? true;
  const mpPixEnabled = mpConfig?.pix_enabled ?? true;
  const mpBoletoEnabled = mpConfig?.boleto_enabled ?? true;
  const mpMaxInstallments = mpConfig?.max_installments || 12;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [cepLoading, setCepLoading] = useState(false);

  // Coupon
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_type: string; discount_value: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Polling
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState<CheckoutForm>({
    name: '', email: '', phone: '', cpf: '',
    cnpj: '', companyName: '', isWholesale: false,
    zip: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '',
    payment: 'pix', couponCode: '',
  });

  const set = useCallback((field: keyof CheckoutForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // ViaCEP
  useEffect(() => {
    const raw = form.zip.replace(/\D/g, '');
    if (raw.length === 8) {
      setCepLoading(true);
      fetch(`https://viacep.com.br/ws/${raw}/json/`)
        .then(r => r.json())
        .then(data => {
          if (!data.erro) {
            setForm(prev => ({
              ...prev,
              street: data.logradouro || prev.street,
              neighborhood: data.bairro || prev.neighborhood,
              city: data.localidade || prev.city,
              state: data.uf || prev.state,
            }));
          } else {
            toast.error('CEP não encontrado');
          }
        })
        .catch(() => toast.error('Erro ao buscar CEP'))
        .finally(() => setCepLoading(false));
    }
  }, [form.zip]);

  // Shipping calculation
  const shipping = useMemo(() => {
    if (!shippingRules?.length) return totalSmart >= 299 ? 0 : 19.90;
    const freeRule = shippingRules.find(r => r.rule_type === 'free_above');
    if (freeRule?.min_order_for_free && totalSmart >= freeRule.min_order_for_free) return 0;
    const stateUpper = form.state.toUpperCase().trim();
    if (stateUpper) {
      const stateRule = shippingRules.find(r => r.rule_type === 'by_state' && r.state?.toUpperCase() === stateUpper);
      if (stateRule) return stateRule.value;
    }
    const fixedRule = shippingRules.find(r => r.rule_type === 'fixed');
    if (fixedRule) return fixedRule.value;
    return 19.90;
  }, [shippingRules, totalSmart, form.state]);

  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? totalSmart * (appliedCoupon.discount_value / 100)
      : appliedCoupon.discount_value
    : 0;
  const afterCoupon = totalSmart - couponDiscount + shipping;
  const pixDiscount = form.payment === 'pix' ? afterCoupon * 0.05 : 0;
  const finalTotal = afterCoupon - pixDiscount;

  // Apply coupon
  const applyCoupon = async () => {
    if (!form.couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons').select('*')
        .eq('code', form.couponCode.toUpperCase().trim())
        .eq('is_active', true).single();
      if (error || !data) { toast.error('Cupom inválido ou expirado.'); setAppliedCoupon(null); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { toast.error('Cupom expirado.'); return; }
      if (data.max_uses && data.used_count >= data.max_uses) { toast.error('Cupom esgotado.'); return; }
      if (data.min_order_value > 0 && totalSmart < data.min_order_value) {
        toast.error(`Pedido mínimo de ${formatCurrency(data.min_order_value)} para este cupom.`); return;
      }
      setAppliedCoupon({ code: data.code, discount_type: data.discount_type, discount_value: data.discount_value });
      toast.success(`Cupom "${data.code}" aplicado!`);
    } finally { setCouponLoading(false); }
  };

  // Step validation
  const isStep1Valid = form.name && form.email && form.phone && form.cpf.replace(/\D/g, '').length === 11;
  const isStep2Valid = form.zip.replace(/\D/g, '').length === 8 && form.street && form.number && form.city && form.state;

  const canProceed = (s: number) => {
    if (s === 1) return isStep1Valid;
    if (s === 2) return isStep2Valid;
    return true;
  };

  // Polling for payment status
  const startPolling = useCallback((orderId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('payment-status', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: null,
        });
        // Use fetch directly for GET with query params
        const res = await fetch(
          `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/payment-status?order_id=${orderId}`,
          { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const status = await res.json();
        if (status.payment_status === 'approved') {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setPaymentResult((prev: any) => ({ ...prev, payment_status: 'approved' }));
          toast.success('Pagamento confirmado!');
        }
      } catch { /* ignore polling errors */ }
    }, 5000);
  }, []);

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // Submit order
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = {
        items: items.map(item => ({
          product_id: item.product.id,
          variant_id: null,
          variant_name: item.selectedColor || null,
          quantity: item.quantity,
        })),
        customer: {
          name: form.name, email: form.email, phone: form.phone.replace(/\D/g, ''),
          cpf: form.cpf.replace(/\D/g, ''),
          cnpj: form.isWholesale ? form.cnpj.replace(/\D/g, '') : null,
          company_name: form.isWholesale ? form.companyName : null,
          is_reseller: form.isWholesale,
        },
        shipping_address: {
          zip: form.zip.replace(/\D/g, ''), street: form.street, number: form.number,
          complement: form.complement, neighborhood: form.neighborhood,
          city: form.city, state: form.state,
        },
        payment_method: form.payment,
        coupon_code: appliedCoupon?.code || null,
      };

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      setPaymentResult(data);
      clearCart();
      setSubmitted(true);

      // Start polling for pix/boleto
      if (form.payment !== 'card' && data.payment_status !== 'approved') {
        startPolling(data.order_id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== SUCCESS SCREEN =====
  if (submitted && paymentResult) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12 md:py-20 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-2">
              {paymentResult.payment_status === 'approved'
                ? <Check className="w-10 h-10 text-primary" />
                : <Loader2 className="w-10 h-10 text-primary animate-spin" />}
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {paymentResult.payment_status === 'approved' ? 'Pedido Confirmado!' : 'Aguardando Pagamento'}
            </h1>
            <p className="font-body text-muted-foreground">
              Pedido #{paymentResult.order_number}
              {paymentResult.payment_status === 'approved'
                ? ' — Pagamento aprovado! Você receberá os detalhes por e-mail.'
                : ' — Complete o pagamento abaixo.'}
            </p>

            {/* PIX payment info */}
            {form.payment === 'pix' && paymentResult.pix && (
              <div className="bg-card rounded-sm shadow-soft p-6 text-left space-y-4">
                <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" /> Pagamento via Pix
                </h3>
                {paymentResult.pix.qr_code_base64 && (
                  <div className="flex justify-center">
                    <img src={`data:image/png;base64,${paymentResult.pix.qr_code_base64}`} alt="QR Code Pix" className="w-48 h-48" />
                  </div>
                )}
                {paymentResult.pix.qr_code && (
                  <>
                    <p className="font-body text-xs text-muted-foreground text-center">Ou copie o código Pix:</p>
                    <div className="flex gap-2">
                      <Input readOnly value={paymentResult.pix.qr_code} className="font-body text-xs" />
                      <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(paymentResult.pix.qr_code); toast.success('Código copiado!'); }}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
                <p className="font-body text-xs text-muted-foreground">⏱ Validade: 30 minutos • Valor: <strong>{formatCurrency(paymentResult.total)}</strong></p>
                <Button variant="outline" className="w-full font-body" onClick={() => startPolling(paymentResult.order_id)}>
                  Já paguei — verificar status
                </Button>
              </div>
            )}

            {/* Boleto payment info */}
            {form.payment === 'boleto' && paymentResult.boleto && (
              <div className="bg-card rounded-sm shadow-soft p-6 text-left space-y-3">
                <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Boleto Bancário
                </h3>
                {paymentResult.boleto.barcode && (
                  <div className="flex gap-2">
                    <Input readOnly value={paymentResult.boleto.barcode} className="font-body text-xs" />
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(paymentResult.boleto.barcode); toast.success('Código copiado!'); }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {paymentResult.boleto.external_resource_url && (
                  <a href={paymentResult.boleto.external_resource_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full font-body">Abrir PDF do Boleto</Button>
                  </a>
                )}
                <p className="font-body text-xs text-muted-foreground">Vencimento em 3 dias úteis • Valor: <strong>{formatCurrency(paymentResult.total)}</strong></p>
              </div>
            )}

            {/* Card approved */}
            {form.payment === 'card' && paymentResult.payment_status === 'approved' && (
              <div className="bg-card rounded-sm shadow-soft p-6 text-left space-y-2">
                <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" /> Pagamento Aprovado
                </h3>
                <p className="font-body text-sm text-muted-foreground">
                  Pagamento de <strong>{formatCurrency(paymentResult.total)}</strong> aprovado
                  {paymentResult.card?.last_four && ` no cartão final ****${paymentResult.card.last_four}`}.
                  {paymentResult.card?.installments > 1 && ` em ${paymentResult.card.installments}x de ${formatCurrency(paymentResult.card.installment_amount)}`}
                </p>
              </div>
            )}

            {/* Fallback: no MP configured */}
            {paymentResult.message && (
              <div className="bg-card rounded-sm shadow-soft p-6 text-left">
                <p className="font-body text-sm text-muted-foreground">{paymentResult.message}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link to="/rastreio" className="inline-flex items-center justify-center border-2 border-primary text-primary font-body font-semibold text-sm tracking-wider uppercase px-8 py-4 rounded-sm hover:bg-primary/5 transition-colors">
                Rastrear Pedido
              </Link>
              <Link to="/" className="inline-flex items-center justify-center bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-8 py-4 rounded-sm shadow-rose">
                Voltar à Loja
              </Link>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // ===== EMPTY CART =====
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="font-body text-muted-foreground mb-4">Seu carrinho está vazio.</p>
          <Link to="/colecoes" className="text-primary underline font-body">Voltar às Coleções</Link>
        </main>
        <Footer />
      </div>
    );
  }

  // ===== MAIN CHECKOUT =====
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <Link to="/carrinho" className="inline-flex items-center gap-1 text-sm font-body text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Carrinho
        </Link>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map(s => (
              <button
                key={s.id}
                onClick={() => { if (s.id < step || canProceed(step)) setStep(s.id); }}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  s.id <= step ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  s.id < step ? 'bg-primary text-primary-foreground' :
                  s.id === step ? 'border-2 border-primary text-primary' :
                  'border-2 border-border text-muted-foreground'
                }`}>
                  {s.id < step ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                </div>
                <span className="font-body text-xs font-medium hidden sm:block">{s.label}</span>
              </button>
            ))}
          </div>
          <Progress value={(step / 4) * 100} className="h-1.5" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form Column */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {/* STEP 1: Personal Data */}
              {step === 1 && (
                <motion.section key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-card rounded-sm shadow-soft p-6 space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Dados Pessoais</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input placeholder="Nome completo *" value={form.name} onChange={e => set('name', e.target.value)} className="font-body" />
                    <Input placeholder="E-mail *" type="email" value={form.email} onChange={e => set('email', e.target.value)} className="font-body" />
                    <Input placeholder="Telefone *" value={form.phone} onChange={e => set('phone', maskPhone(e.target.value))} className="font-body" />
                    <Input placeholder="CPF *" value={form.cpf} onChange={e => set('cpf', maskCPF(e.target.value))} className="font-body" />
                  </div>

                  <button onClick={() => set('isWholesale', !form.isWholesale)}
                    className={`flex items-center gap-2 text-sm font-body transition-colors ${form.isWholesale ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                    <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-colors ${form.isWholesale ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                      {form.isWholesale && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    Compra para revenda / CNPJ
                  </button>

                  {form.isWholesale && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input placeholder="CNPJ" value={form.cnpj} onChange={e => set('cnpj', maskCNPJ(e.target.value))} className="font-body" />
                      <Input placeholder="Razão Social" value={form.companyName} onChange={e => set('companyName', e.target.value)} className="font-body" />
                    </motion.div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button onClick={() => setStep(2)} disabled={!isStep1Valid} className="bg-gradient-rose text-primary-foreground font-body font-semibold shadow-rose gap-2">
                      Próximo <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.section>
              )}

              {/* STEP 2: Address */}
              {step === 2 && (
                <motion.section key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-card rounded-sm shadow-soft p-6 space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Endereço de Entrega</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative md:col-span-1">
                      <Input placeholder="CEP *" value={form.zip} onChange={e => set('zip', maskCEP(e.target.value))} className="font-body" />
                      {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
                    </div>
                    <Input placeholder="Rua / Avenida *" value={form.street} onChange={e => set('street', e.target.value)} className="font-body md:col-span-2" />
                    <Input placeholder="Número *" value={form.number} onChange={e => set('number', e.target.value)} className="font-body" />
                    <Input placeholder="Complemento" value={form.complement} onChange={e => set('complement', e.target.value)} className="font-body" />
                    <Input placeholder="Bairro" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} className="font-body" />
                    <Input placeholder="Cidade *" value={form.city} onChange={e => set('city', e.target.value)} className="font-body md:col-span-2" />
                    <Input placeholder="Estado *" value={form.state} onChange={e => set('state', e.target.value)} className="font-body" maxLength={2} />
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="font-body gap-2">
                      <ArrowLeft className="w-4 h-4" /> Voltar
                    </Button>
                    <Button onClick={() => setStep(3)} disabled={!isStep2Valid} className="bg-gradient-rose text-primary-foreground font-body font-semibold shadow-rose gap-2">
                      Próximo <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.section>
              )}

              {/* STEP 3: Shipping */}
              {step === 3 && (
                <motion.section key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-card rounded-sm shadow-soft p-6 space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Entrega</h2>
                  <div className="bg-muted/30 rounded-sm p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-body text-sm font-semibold text-foreground">
                          {shipping === 0 ? 'Frete Grátis' : `Frete: ${formatCurrency(shipping)}`}
                        </p>
                        <p className="font-body text-xs text-muted-foreground">
                          Entrega para {form.city}/{form.state} • CEP {form.zip}
                        </p>
                      </div>
                    </div>
                    {shipping === 0 && (
                      <p className="font-body text-xs text-primary">🎉 Parabéns! Você ganhou frete grátis neste pedido.</p>
                    )}
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(2)} className="font-body gap-2">
                      <ArrowLeft className="w-4 h-4" /> Voltar
                    </Button>
                    <Button onClick={() => setStep(4)} className="bg-gradient-rose text-primary-foreground font-body font-semibold shadow-rose gap-2">
                      Próximo <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.section>
              )}

              {/* STEP 4: Payment */}
              {step === 4 && (
                <motion.section key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-card rounded-sm shadow-soft p-6 space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">Pagamento</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { id: 'pix' as const, label: 'Pix', icon: QrCode, extra: '5% off', enabled: mpPixEnabled },
                      { id: 'card' as const, label: 'Cartão', icon: CreditCard, extra: `Até ${mpMaxInstallments}x`, enabled: mpCardEnabled },
                      { id: 'boleto' as const, label: 'Boleto', icon: FileText, extra: '3 dias úteis', enabled: mpBoletoEnabled },
                    ]).filter(m => m.enabled).map(m => (
                      <button key={m.id} onClick={() => set('payment', m.id)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-sm border-2 transition-all ${
                          form.payment === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                        }`}>
                        <m.icon className={`w-5 h-5 ${form.payment === m.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="font-body text-sm font-semibold text-foreground">{m.label}</span>
                        <span className="font-body text-[10px] text-muted-foreground">{m.extra}</span>
                      </button>
                    ))}
                  </div>

                  {/* Card fields - SDK Mercado Pago */}
                  {form.payment === 'card' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-muted/20 rounded-sm border border-border">
                      {!mpPublicKey ? (
                        <p className="font-body text-xs text-destructive md:col-span-2">
                          ⚠️ Public Key do Mercado Pago não configurada. Configure em Admin → Integrações.
                        </p>
                      ) : (
                        <p className="font-body text-xs text-muted-foreground md:col-span-2">
                          Preencha os dados do cartão para tokenização segura via Mercado Pago.
                        </p>
                      )}
                      <Input placeholder="Número do cartão" id="cardNumber" className="font-body md:col-span-2" />
                      <Input placeholder="Nome no cartão" id="cardholderName" className="font-body" />
                      <div className="grid grid-cols-2 gap-4">
                        <Input placeholder="MM/AA" id="cardExpiration" className="font-body" maxLength={5} />
                        <Input placeholder="CVV" id="securityCode" className="font-body" maxLength={4} />
                      </div>
                      {/* Installments */}
                      <div className="md:col-span-2 space-y-2">
                        <p className="font-body text-xs font-semibold text-foreground">Parcelas:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-body">
                          <div className="p-2 rounded bg-primary/5 border border-primary text-primary font-medium">1x de {formatCurrency(finalTotal)} s/ juros</div>
                          {Array.from({ length: Math.min(5, mpMaxInstallments - 1) }, (_, i) => i + 2).map(n => {
                            const t = finalTotal * (1 + 0.0299 * n);
                            return <div key={n} className="p-2 rounded bg-muted/30 border border-border text-muted-foreground">{n}x de {formatCurrency(t / n)}</div>;
                          })}
                          {Array.from({ length: Math.max(0, Math.min(6, mpMaxInstallments - 6)) }, (_, i) => i + 7).map(n => {
                            const t = finalTotal * (1 + 0.0349 * n);
                            return <div key={n} className="p-2 rounded bg-muted/30 border border-border text-muted-foreground">{n}x de {formatCurrency(t / n)}</div>;
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(3)} className="font-body gap-2">
                      <ArrowLeft className="w-4 h-4" /> Voltar
                    </Button>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {/* Summary Column */}
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

              {/* Coupon */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Cupom" value={form.couponCode} onChange={e => set('couponCode', e.target.value)}
                    className="pl-9 font-body uppercase text-xs" disabled={!!appliedCoupon} />
                </div>
                {appliedCoupon
                  ? <Button variant="outline" size="sm" onClick={() => { setAppliedCoupon(null); set('couponCode', ''); }} className="font-body text-xs">Remover</Button>
                  : <Button variant="outline" size="sm" onClick={applyCoupon} disabled={couponLoading} className="font-body text-xs">Aplicar</Button>}
              </div>

              {/* Totals */}
              <div className="border-t border-border pt-3 space-y-2 font-body text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>{formatCurrency(totalSmart)}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-primary font-medium">
                    <span>Economia Smart</span><span>-{formatCurrency(totalSavings)}</span>
                  </div>
                )}
                {appliedCoupon && couponDiscount > 0 && (
                  <div className="flex justify-between text-primary font-medium">
                    <span>Cupom ({appliedCoupon.code})</span><span>-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Frete</span>
                  <span>{shipping === 0 ? <span className="text-primary font-medium">Grátis</span> : formatCurrency(shipping)}</span>
                </div>
                {form.payment === 'pix' && (
                  <div className="flex justify-between text-primary font-medium">
                    <span>Desconto Pix (5%)</span><span>-{formatCurrency(pixDiscount)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3 flex justify-between font-body">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-display text-xl font-bold text-foreground">{formatCurrency(finalTotal)}</span>
              </div>

              {/* CTA only on step 4 */}
              {step === 4 && (
                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-6 py-4 rounded-sm hover:opacity-90 transition-opacity shadow-rose disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : 'Finalizar Compra'}
                </button>
              )}

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 text-xs font-body text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-primary" /> SSL Seguro</span>
                <span className="flex items-center gap-1"><CreditCard className="w-4 h-4 text-primary" /> Mercado Pago</span>
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-primary" /> Garantia 30 dias</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile fixed CTA */}
        {step === 4 && (
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 lg:hidden z-50">
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-6 py-4 rounded-sm shadow-rose disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : `Finalizar — ${formatCurrency(finalTotal)}`}
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
