import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, CreditCard, QrCode, FileText, Check } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { formatCurrency, getSmartPrice } from '@/data/products';
import { Input } from '@/components/ui/input';

type PaymentMethod = 'pix' | 'cartao' | 'boleto';

const Checkout = () => {
  const { items, totalSmart, totalSavings } = useCart();
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [isWholesale, setIsWholesale] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
  const total = totalSmart + shipping;
  const pixDiscount = total * 0.05;

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
                <Input placeholder="Nome completo" className="font-body" />
                <Input placeholder="E-mail" type="email" className="font-body" />
                <Input placeholder="Telefone / WhatsApp" className="font-body" />
                <Input placeholder="CPF" className="font-body" />
              </div>

              {/* Wholesale toggle */}
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
                  <Input placeholder="CNPJ" className="font-body" />
                  <Input placeholder="Razão Social" className="font-body" />
                </motion.div>
              )}
            </section>

            {/* Address */}
            <section className="bg-card rounded-sm shadow-soft p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Endereço de Entrega</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input placeholder="CEP" className="font-body md:col-span-1" />
                <Input placeholder="Rua / Avenida" className="font-body md:col-span-2" />
                <Input placeholder="Número" className="font-body" />
                <Input placeholder="Complemento" className="font-body" />
                <Input placeholder="Bairro" className="font-body" />
                <Input placeholder="Cidade" className="font-body md:col-span-2" />
                <Input placeholder="Estado" className="font-body" />
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

              {/* Items */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {items.map(item => {
                  const smart = getSmartPrice(item.product.retailPrice, item.product.box06Price, item.product.box12Price, item.quantity);
                  return (
                    <div key={item.product.id} className="flex justify-between items-center text-sm font-body">
                      <div className="min-w-0">
                        <span className="text-foreground font-medium truncate block">{item.product.name}</span>
                        <span className="text-muted-foreground text-xs">{item.quantity}x {formatCurrency(smart.price)}</span>
                      </div>
                      <span className="text-foreground font-semibold ml-4">{formatCurrency(smart.price * item.quantity)}</span>
                    </div>
                  );
                })}
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
                  {formatCurrency(payment === 'pix' ? total - pixDiscount : total)}
                </span>
              </div>

              <button
                onClick={() => setSubmitted(true)}
                className="w-full bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-6 py-4 rounded-sm hover:opacity-90 transition-opacity shadow-rose"
              >
                Confirmar Pedido
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
