import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency, getSmartPrice } from '@/data/products';

const CartDrawer = () => {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, totalSmart, totalSavings, totalItems } = useCart();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-foreground/40 z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-display text-lg font-semibold text-foreground">Carrinho ({totalItems})</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="font-body text-muted-foreground">Seu carrinho está vazio</p>
                </div>
              ) : (
                items.map(item => {
                  const smart = getSmartPrice(item.product.retailPrice, item.product.box06Price, item.product.box12Price, item.quantity);
                  return (
                    <motion.div
                      key={item.product.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex gap-4 p-3 bg-card rounded-sm"
                    >
                      <div className="w-20 h-20 rounded-sm bg-secondary flex-shrink-0 overflow-hidden">
                        <div className="w-full h-full bg-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-sm font-medium text-foreground truncate">{item.product.name}</h3>
                        <p className="text-xs font-body text-muted-foreground">{item.selectedColor}</p>
                        <div className="mt-1">
                          <span className="font-body text-sm font-semibold text-foreground">{formatCurrency(smart.price)}</span>
                          {smart.discount > 0 && (
                            <span className="text-xs font-body text-primary ml-2">{smart.label} (-{smart.discount}%)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 rounded-sm bg-secondary text-foreground hover:bg-muted">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-body text-sm font-medium w-6 text-center text-foreground">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 rounded-sm bg-secondary text-foreground hover:bg-muted">
                            <Plus className="w-3 h-3" />
                          </button>
                          <button onClick={() => removeItem(item.product.id)} className="ml-auto p-1 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border p-4 space-y-3">
                {totalSavings > 0 && (
                  <div className="bg-primary/10 text-primary rounded-sm px-3 py-2 text-sm font-body font-medium text-center">
                    🎉 Você está economizando {formatCurrency(totalSavings)}!
                  </div>
                )}
                <div className="flex justify-between font-body text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-foreground">{formatCurrency(totalSmart)}</span>
                </div>
                <Link
                  to="/carrinho"
                  onClick={() => setIsCartOpen(false)}
                  className="block w-full text-center bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-6 py-4 rounded-sm hover:opacity-90 transition-opacity shadow-rose"
                >
                  Finalizar Compra
                </Link>
                <p className="text-xs font-body text-muted-foreground text-center">Frete calculado no checkout</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
