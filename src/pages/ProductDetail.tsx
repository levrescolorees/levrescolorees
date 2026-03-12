import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Minus, Plus, ShoppingBag, ChevronLeft, Truck, ShieldCheck, Award, Loader2, ImageIcon } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import { useProductBySlug, useStorefrontProducts, formatCurrency, getSmartPriceFromRules } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import WhatsAppButton from '@/components/WhatsAppButton';

const ProductDetail = () => {
  const { slug } = useParams();
  const { data: product, isLoading } = useProductBySlug(slug);
  const { data: allProducts } = useStorefrontProducts();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);

  const related = useMemo(() =>
    (allProducts ?? []).filter(p => p.id !== product?.id).slice(0, 4),
    [allProducts, product]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="font-body text-muted-foreground">Produto não encontrado.</p>
          <Link to="/colecoes" className="text-primary underline mt-4 inline-block">Voltar às Coleções</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const colors = product.variants.map(v => v.name);
  const color = selectedColor || colors[0] || 'Padrão';
  const smart = getSmartPriceFromRules(product.retail_price, product.priceRules, quantity);

  const box06 = getSmartPriceFromRules(product.retail_price, product.priceRules, 6);
  const box12 = getSmartPriceFromRules(product.retail_price, product.priceRules, 12);

  const pricingTiers = [
    { qty: '1 un.', price: product.retail_price, label: 'Varejo', active: quantity < 6, discount: 0 },
    { qty: '6 un.', price: box06.price, label: 'Box 06', discount: box06.discount, active: quantity >= 6 && quantity < 12 },
    { qty: '12 un.', price: box12.price, label: 'Box 12', discount: box12.discount, active: quantity >= 12 },
  ];

  const handleAddToCart = () => {
    const legacyProduct = {
      id: product.id, name: product.name, slug: product.slug,
      description: product.description, shortDescription: product.short_description,
      retailPrice: product.retail_price, box06Price: box06.price, box12Price: box12.price,
      images: product.images, collection: 'bestsellers' as const, colors,
      badge: product.badge as any, rating: product.rating, reviews: product.reviews_count,
      idealForResale: product.ideal_for_resale, suggestedMargin: product.suggested_margin,
      unitsPerBox06: 6, unitsPerBox12: 12,
    };
    addItem(legacyProduct, quantity, color);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 md:py-12">
        <Link to="/colecoes" className="inline-flex items-center gap-1 text-sm font-body text-muted-foreground hover:text-primary mb-6">
          <ChevronLeft className="w-4 h-4" /> Voltar às Coleções
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          {/* Gallery */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            <div className="aspect-square rounded-sm overflow-hidden bg-secondary">
              {product.images?.[selectedImage] ? (
                <img src={product.images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-muted-foreground/50" />
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.slice(0, 5).map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={`aspect-square rounded-sm overflow-hidden bg-secondary border-2 transition-colors cursor-pointer ${selectedImage === i ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}>
                    <img src={img} alt={product.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            {product.badge && (
              <span className="inline-block bg-primary text-primary-foreground text-[10px] font-body font-bold tracking-wider uppercase px-3 py-1.5 rounded-sm">
                {product.badge}
              </span>
            )}
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground">{product.name}</h1>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-gold text-gold' : 'text-muted'}`} />
                ))}
              </div>
              <span className="text-sm font-body text-muted-foreground">{product.rating} ({product.reviews_count} avaliações)</span>
            </div>

            {/* Current price */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl font-bold text-foreground">{formatCurrency(smart.price)}</span>
                {smart.discount > 0 && (
                  <>
                    <span className="text-lg font-body text-muted-foreground line-through">{formatCurrency(product.retail_price)}</span>
                    <span className="bg-primary/10 text-primary text-xs font-body font-bold px-2 py-1 rounded-sm">-{smart.discount}%</span>
                  </>
                )}
              </div>
              <p className="text-sm font-body text-primary font-medium">{smart.label}</p>
            </div>

            {/* Pricing table */}
            <div className="bg-secondary rounded-sm p-4 space-y-2">
              <h3 className="font-body text-xs font-bold tracking-wider uppercase text-muted-foreground mb-3">Tabela de Preços</h3>
              {pricingTiers.map(tier => (
                <div key={tier.label} className={`flex items-center justify-between py-2 px-3 rounded-sm transition-colors ${tier.active ? 'bg-primary/10 border border-primary/20' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-body text-sm font-medium text-foreground">{tier.qty}</span>
                    <span className="text-xs font-body text-muted-foreground">{tier.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-body text-sm font-semibold text-foreground">{formatCurrency(tier.price)}</span>
                    {tier.discount > 0 && <span className="text-[10px] font-body text-primary font-bold">-{tier.discount}%</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Resale badge */}
            {product.ideal_for_resale && (() => {
              const atacadoPrice = box12.price;
              const realMargin = atacadoPrice > 0 ? ((product.retail_price - atacadoPrice) / atacadoPrice) * 100 : 0;
              return (
                <div className="bg-accent/10 border border-accent/20 rounded-sm p-4 flex items-start gap-3">
                  <Award className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-body text-sm font-semibold text-foreground">Ideal para Revendedores</p>
                    <p className="font-body text-xs text-muted-foreground">
                      Preço sugerido de venda: {formatCurrency(product.retail_price)} | Margem estimada: {realMargin.toFixed(0)}%
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Color selector */}
            {colors.length > 0 && (
              <div>
                <h3 className="font-body text-sm font-semibold text-foreground mb-3">Cor: {color}</h3>
                <div className="flex flex-wrap gap-2">
                  {colors.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`px-3 py-1.5 rounded-sm text-sm font-body transition-colors ${c === color ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <h3 className="font-body text-sm font-semibold text-foreground mb-3">Quantidade</h3>
              <div className="flex items-center gap-1">
                {[1, 6, 12].map(q => (
                  <button key={q} onClick={() => setQuantity(q)} className={`px-4 py-2 rounded-sm text-sm font-body transition-colors ${quantity === q ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'}`}>
                    {q} un.
                  </button>
                ))}
                <div className="flex items-center gap-2 ml-4 bg-secondary rounded-sm px-2">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 text-foreground hover:text-primary">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-body text-sm font-semibold w-8 text-center text-foreground">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-2 text-foreground hover:text-primary">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Add to cart */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddToCart}
              className="w-full flex items-center justify-center gap-3 bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-8 py-4 rounded-sm hover:opacity-90 transition-opacity shadow-rose"
            >
              <ShoppingBag className="w-5 h-5" />
              Adicionar ao Carrinho • {formatCurrency(smart.price * quantity)}
            </motion.button>

            {/* Trust signals */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                <Truck className="w-4 h-4 text-primary" /> Envio em 24h
              </div>
              <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-primary" /> Compra 100% segura
              </div>
            </div>

            {/* Description */}
            <div className="pt-4 border-t border-border">
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">Detalhes do Produto</h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          </motion.div>
        </div>

        {/* Cross-sell */}
        {related.length > 0 && (
          <section className="mt-16 md:mt-24">
            <div className="text-center mb-8">
              <span className="text-sm font-body tracking-[0.3em] uppercase text-primary mb-2 block">Combine</span>
              <h2 className="font-display text-2xl font-semibold text-foreground">Quem compra este produto também leva</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </section>
        )}
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />

      {/* Mobile fixed CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-3 z-40">
        <button
          onClick={handleAddToCart}
          className="w-full flex items-center justify-center gap-2 bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-6 py-3.5 rounded-sm shadow-rose"
        >
          <ShoppingBag className="w-4 h-4" />
          Adicionar • {formatCurrency(smart.price * quantity)}
        </button>
      </div>
    </div>
  );
};

export default ProductDetail;
