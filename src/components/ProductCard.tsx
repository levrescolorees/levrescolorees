import { Link } from 'react-router-dom';
import { Star, ShoppingBag, ImageIcon } from 'lucide-react';
import { formatCurrency, getSmartPriceFromRules } from '@/hooks/useProducts';
import type { DBProduct, DBPriceRule, DBVariant } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import { useAnimateOnView } from '@/hooks/useAnimateOnView';

interface ProductCardProps {
  product: DBProduct & { variants: DBVariant[]; priceRules: DBPriceRule[] };
  index?: number;
}

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const { addItem } = useCart();
  const box12 = getSmartPriceFromRules(product.retail_price, product.priceRules, 12);
  const { ref, className: animClass } = useAnimateOnView(index * 100);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    const legacyProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.short_description,
      retailPrice: product.retail_price,
      box06Price: getSmartPriceFromRules(product.retail_price, product.priceRules, 6).price,
      box12Price: box12.price,
      images: product.images,
      collection: 'bestsellers' as const,
      colors: product.variants.map(v => v.name),
      badge: product.badge as any,
      rating: product.rating,
      reviews: product.reviews_count,
      idealForResale: product.ideal_for_resale,
      suggestedMargin: product.suggested_margin,
      unitsPerBox06: 6,
      unitsPerBox12: 12,
    };
    addItem(legacyProduct, 1, product.variants[0]?.name || 'Padrão');
  };

  return (
    <div
      ref={ref}
      className={`group transition-all duration-500 ease-out ${animClass}`}
    >
      <Link to={`/produto/${product.slug}`} className="block">
        <div className="relative overflow-hidden rounded-sm bg-secondary aspect-[3/4] mb-4">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
            </div>
          )}
          {product.badge && (
            <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-body font-bold tracking-wider uppercase px-3 py-1.5 rounded-sm">
              {product.badge}
            </span>
          )}
          {product.ideal_for_resale && (
            <span className="absolute top-3 right-3 bg-accent text-accent-foreground text-[10px] font-body font-bold tracking-wider uppercase px-3 py-1.5 rounded-sm">
              Ideal Revenda
            </span>
          )}
          <button
            onClick={handleAddToCart}
            className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm text-foreground p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-105 active:scale-95 shadow-soft"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-display text-base font-medium text-foreground group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-xs font-body text-muted-foreground">{product.short_description}</p>
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-gold text-gold" />
            <span className="text-xs font-body text-foreground font-medium">{product.rating}</span>
            <span className="text-xs font-body text-muted-foreground">({product.reviews_count})</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-body font-semibold text-foreground">{formatCurrency(product.retail_price)}</span>
            {box12.discount > 0 && (
              <span className="text-xs font-body text-primary font-medium">
                a partir de {formatCurrency(box12.price)} no atacado
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
