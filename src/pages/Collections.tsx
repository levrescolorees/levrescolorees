import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import { useStorefrontProducts, useCollections } from '@/hooks/useProducts';

const priceRanges = [
  { label: 'Todos', min: 0, max: Infinity },
  { label: 'Até R$30', min: 0, max: 30 },
  { label: 'R$30 - R$40', min: 30, max: 40 },
  { label: 'R$40+', min: 40, max: Infinity },
];

interface CollectionsProps {
  initialFilter?: string | null;
}

const Collections = ({ initialFilter = null }: CollectionsProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const searchTerm = searchParams.get('search') || '';
  const resolvedFilter = initialFilter ?? filterParam ?? 'all';
  const [activeCollection, setActiveCollection] = useState(resolvedFilter);
  const [activePriceRange, setActivePriceRange] = useState(0);

  useEffect(() => {
    setActiveCollection(resolvedFilter);
  }, [resolvedFilter]);

  const { data: products, isLoading } = useStorefrontProducts();
  const { data: collections } = useCollections();

  const clearSearch = () => {
    searchParams.delete('search');
    setSearchParams(searchParams);
  };

  const filtered = useMemo(() => {
    let list = products ?? [];
    if (activeCollection !== 'all') {
      list = list.filter(p => p.collections?.some((c: any) => c.slug === activeCollection));
    }
    const range = priceRanges[activePriceRange];
    list = list.filter(p => p.retail_price >= range.min && p.retail_price < range.max);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.short_description && p.short_description.toLowerCase().includes(term))
      );
    }
    return list;
  }, [products, activeCollection, activePriceRange, searchTerm]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10 md:py-16">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-2">
            {searchTerm ? `Resultados para "${searchTerm}"` : 'Coleções'}
          </h1>
          {searchTerm ? (
            <button onClick={clearSearch} className="text-sm font-body text-primary hover:underline mt-1">
              Limpar busca
            </button>
          ) : (
            <p className="font-body text-muted-foreground">Encontre o produto perfeito para você ou para revenda</p>
          )}
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setActiveCollection('all')}
              className={`px-4 py-2 rounded-sm text-sm font-body transition-colors ${activeCollection === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'}`}
            >
              Todos
            </button>
            {(collections ?? []).map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCollection(c.slug)}
                className={`px-4 py-2 rounded-sm text-sm font-body transition-colors ${activeCollection === c.slug ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'}`}
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

        {isLoading ? (
          <div className="text-center py-20">
            <p className="font-body text-muted-foreground">Carregando...</p>
          </div>
        ) : filtered.length > 0 ? (
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
