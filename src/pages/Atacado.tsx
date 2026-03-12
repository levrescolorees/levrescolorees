import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, Percent, Users } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import { useStorefrontProducts, formatCurrency, getSmartPriceFromRules } from '@/hooks/useProducts';
import WhatsAppButton from '@/components/WhatsAppButton';
import ProfitCalculator from '@/components/ProfitCalculator';
import box06Img from '@/assets/box-06.jpg';
import box12Img from '@/assets/box-12.jpg';

const Atacado = () => {
  const { data: products, isLoading } = useStorefrontProducts();
  const firstProduct = products?.[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-hero py-16 md:py-24">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="text-sm font-body tracking-[0.3em] uppercase text-primary mb-3 block">Atacado & Atacarejo</span>
              <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
                Revenda com <span className="italic text-gradient-rose">alta margem</span>
              </h1>
              <p className="font-body text-muted-foreground text-base md:text-lg leading-relaxed mb-8">
                Compre em quantidade e economize até 40%. Produtos premium prontos para revenda com alta demanda e margem garantida.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Package, title: 'Kits Prontos', desc: 'Box 06 e Box 12 com mix de cores' },
              { icon: TrendingUp, title: 'Alta Margem', desc: 'Até 65% de margem sugerida' },
              { icon: Percent, title: 'Preço Especial', desc: 'Desconto progressivo automático' },
              { icon: Users, title: 'Suporte', desc: 'Atendimento exclusivo para revendedores' },
            ].map((b, i) => (
              <motion.div key={b.title} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-body text-sm font-semibold text-foreground mb-1">{b.title}</h3>
                <p className="text-xs font-body text-muted-foreground">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Box options */}
        {firstProduct && (
          <section className="py-12 md:py-20 container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { name: 'Box 06', img: box06Img, units: 6, desc: 'Ideal para começar a revender' },
                { name: 'Box 12', img: box12Img, units: 12, desc: 'Melhor custo-benefício' },
              ].map((box, i) => {
                const boxPrice = getSmartPriceFromRules(firstProduct.retail_price, firstProduct.priceRules, box.units);
                return (
                  <motion.div key={box.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="bg-card rounded-sm shadow-soft overflow-hidden">
                    <div className="aspect-video overflow-hidden">
                      <img src={box.img} alt={box.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-6">
                      <h3 className="font-display text-xl font-semibold text-foreground mb-2">{box.name}</h3>
                      <p className="font-body text-sm text-muted-foreground mb-4">{box.desc} • {box.units} unidades por kit</p>
                      <div className="bg-secondary rounded-sm p-4 mb-4">
                        <p className="text-xs font-body text-muted-foreground mb-2">Exemplo: {firstProduct.name}</p>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-body text-muted-foreground line-through">{formatCurrency(firstProduct.retail_price)} /un. varejo</span>
                          <span className="font-body font-bold text-primary text-lg">{formatCurrency(boxPrice.price)} /un.</span>
                        </div>
                      </div>
                      <Link to="/colecoes" className="block w-full text-center bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-6 py-3 rounded-sm hover:opacity-90 transition-opacity shadow-rose">
                        Ver Produtos
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Profit Calculator */}
        <ProfitCalculator />

        {/* All products */}
        <section className="py-12 md:py-20 bg-secondary/50">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8 text-center">Todos os Produtos para Revenda</h2>
            {isLoading ? (
              <p className="text-center font-body text-muted-foreground">Carregando...</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                {(products ?? []).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
    </div>
  );
};

export default Atacado;
