import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingBag, ImageIcon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, getSmartPriceFromRules } from '@/hooks/useProducts';
import type { DBProduct, DBPriceRule, DBVariant } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
  product: DBProduct & { variants: DBVariant[]; priceRules: DBPriceRule[] };
  index?: number;
}

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const { addItem } = useCart();
  const qc = useQueryClient();
  const box12 = getSmartPriceFromRules(product.retail_price, product.priceRules, 12);
  const eager = index < 4;

  const prefetch = useCallback(() => {
    qc.prefetchQuery({
      queryKey: ['product', product.slug],
      staleTime: 5 * 60_000,
      queryFn: async () => {
        const { data: p } = await supabase.from('products').select('*').eq('slug', product.slug).eq('is_active', true).maybeSingle();
        if (!p) return null;
        const [{ data: variants }, { data: priceRules }] = await Promise.all([
          supabase.from('product_variants').select('*').eq('product_id', p.id).order('sort_order'),
          supabase.from('price_rules').select('*').eq('product_id', p.id).eq('is_active', true).order('min_quantity'),
        ]);
        return { ...p, variants: variants || [], priceRules: priceRules || [] };
      },
    });
  }, [qc, product.slug]);

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
    <div className="group">
      <Link
        to={`/produto/${product.slug}`}
        className="block"
        onMouseEnter={prefetch}
        onTouchStart={prefetch}
      >
        <div className="relative overflow-hidden rounded-2xl bg-background shadow-rose-warm border border-transparent hover:border-rose-gold/30 transition-all aspect-[3/4] mb-4">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              {...({ fetchpriority: eager ? 'high' : 'low' } as any)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
            </div>
          )}
          {product.badge && (
            <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-body font-bold tracking-wider uppercase px-3 py-1.5 rounded-full">
              {product.badge}
            </span>
          )}
          {product.ideal_for_resale && (
            <span className="absolute top-3 right-3 bg-rose-gold text-primary-foreground text-[10px] font-body font-bold tracking-wider uppercase px-3 py-1.5 rounded-full">
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

export default memo(ProductCard);
