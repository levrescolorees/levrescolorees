import { useStorefrontProducts } from '@/hooks/useProducts';
import ProductCard from './ProductCard';

const FeaturedProducts = () => {
  const { data: products, isLoading } = useStorefrontProducts();
  const featured = products?.filter(p => p.badge === 'Mais Vendido').slice(0, 4) ?? [];

  if (isLoading || featured.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-sm font-body tracking-[0.3em] uppercase text-primary mb-2 block">Destaques</span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">Mais Vendidos</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {featured.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
