import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, Truck, Tag } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/context/CartContext';
import { formatCurrency, getSmartPrice } from '@/data/products';
import { useStorefrontProducts } from '@/hooks/useProducts';

const Cart = () => {
  const { items, updateQuantity, removeItem, totalSmart, totalSavings, totalRetail } = useCart();
  const { data: products } = useStorefrontProducts();
  const upsell = (products ?? []).filter(p => !items.find(i => i.product.id === p.id)).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-16">
        <Link to="/colecoes" className="inline-flex items-center gap-1 text-sm font-body text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Continuar Comprando
        </Link>

        <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8">Seu Carrinho</h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="font-body text-muted-foreground mb-4">Seu carrinho está vazio</p>
            <Link to="/colecoes" className="inline-flex items-center justify-center bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-8 py-4 rounded-sm shadow-rose">
              Explorar Coleções
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => {
                const smart = getSmartPrice(item.product.retailPrice, item.product.box06Price, item.product.box12Price, item.quantity);
                const savingPerUnit = item.product.retailPrice - smart.price;
                return (
                  <motion.div key={item.product.id} layout className="flex gap-4 p-4 bg-card rounded-sm shadow-soft">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-sm bg-secondary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-display text-base font-medium text-foreground">{item.product.name}</h3>
                          <p className="text-xs font-body text-muted-foreground">{item.selectedColor}</p>
                        </div>
                        <button onClick={() => removeItem(item.product.id)} className="p-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-body font-semibold text-foreground">{formatCurrency(smart.price)}</span>
                        {smart.discount > 0 && (
                          <span className="text-xs font-body text-primary">{smart.label} (-{smart.discount}%)</span>
                        )}
                      </div>
                      {savingPerUnit > 0 && (
                        <p className="text-xs font-body text-primary mt-1">
                          <Tag className="w-3 h-3 inline mr-1" />
                          Economia de {formatCurrency(savingPerUnit)} por unidade
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1.5 rounded-sm bg-secondary text-foreground hover:bg-muted">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-body text-sm font-medium w-8 text-center text-foreground">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1.5 rounded-sm bg-secondary text-foreground hover:bg-muted">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="ml-auto font-body font-semibold text-foreground">{formatCurrency(smart.price * item.quantity)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-card rounded-sm shadow-soft p-6 space-y-4 sticky top-28">
                <h2 className="font-display text-lg font-semibold text-foreground">Resumo do Pedido</h2>
                <div className="space-y-2 font-body text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal (varejo)</span>
                    <span className="line-through">{formatCurrency(totalRetail)}</span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex justify-between text-primary font-medium">
                      <span>Desconto progressivo</span>
                      <span>-{formatCurrency(totalSavings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Frete</span>
                    <span>Calculado no checkout</span>
                  </div>
                </div>
                <div className="border-t border-border pt-4 flex justify-between font-body">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-display text-xl font-bold text-foreground">{formatCurrency(totalSmart)}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="bg-primary/10 text-primary rounded-sm px-3 py-2 text-sm font-body font-medium text-center">
                    🎉 Economia total: {formatCurrency(totalSavings)}
                  </div>
                )}
                <Link to="/checkout" className="block w-full text-center bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-6 py-4 rounded-sm hover:opacity-90 transition-opacity shadow-rose">
                  Finalizar Compra
                </Link>
                <p className="text-xs font-body text-muted-foreground text-center">Pix com 5% off • Frete grátis acima de R$299</p>
              </div>
            </div>
          </div>
        )}

        {/* Upsell */}
        {items.length > 0 && upsell.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-semibold text-foreground mb-8">Complemente seu pedido</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {upsell.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </section>
        )}
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
};

export default Cart;
