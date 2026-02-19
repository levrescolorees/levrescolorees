import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import { products, collections } from '@/data/products';

const priceRanges = [
  { label: 'Todos', min: 0, max: Infinity },
  { label: 'Até R$30', min: 0, max: 30 },
  { label: 'R$30 - R$40', min: 30, max: 40 },
  { label: 'R$40+', min: 40, max: Infinity },
];

const Collections = () => {
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const [activeCollection, setActiveCollection] = useState(filterParam || 'all');
  const [activePriceRange, setActivePriceRange] = useState(0);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCollection !== 'all') {
      list = list.filter(p => p.collection === activeCollection);
    }
    const range = priceRanges[activePriceRange];
    list = list.filter(p => p.retailPrice >= range.min && p.retailPrice < range.max);
    return list;
  }, [activeCollection, activePriceRange]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 md:py-16">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-2">Coleções</h1>
          <p className="font-body text-muted-foreground">Encontre o produto perfeito para você ou para revenda</p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setActiveCollection('all')}
              className={`px-4 py-2 rounded-sm text-sm font-body transition-colors ${activeCollection === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'}`}
            >
              Todos
            </button>
            {collections.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCollection(c.id)}
                className={`px-4 py-2 rounded-sm text-sm font-body transition-colors ${activeCollection === c.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {priceRanges.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setActivePriceRange(i)}
                className={`px-3 py-1.5 rounded-sm text-xs font-body transition-colors ${activePriceRange === i ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:bg-muted'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-20">
            <p className="font-body text-muted-foreground">Nenhum produto encontrado com os filtros selecionados.</p>
          </div>
        )}
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
};

export default Collections;
