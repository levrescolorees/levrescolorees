import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import heroBanner from '@/assets/hero-banner.jpg';

const HeroBanner = () => {
  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBanner} alt="Lèvres Colorées - Lip products premium" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/40 to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-xl"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-block text-rose-glow text-sm font-body tracking-[0.3em] uppercase mb-4"
          >
            Nova Coleção 2025
          </motion.span>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-tight mb-6">
            Seus lábios,<br />
            <span className="italic text-rose-glow">sua assinatura.</span>
          </h1>
          <p className="text-primary-foreground/80 text-base md:text-lg font-body leading-relaxed mb-8 max-w-md">
            Cores vibrantes, texturas irresistíveis. Do varejo ao atacado, encontre o mix perfeito para brilhar — ou revender.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/colecoes"
              className="inline-flex items-center justify-center bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-8 py-4 rounded-sm hover:opacity-90 transition-opacity shadow-rose"
            >
              Comprar Agora
            </Link>
            <Link
              to="/atacado"
              className="inline-flex items-center justify-center border-2 border-primary-foreground/40 text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-8 py-4 rounded-sm hover:bg-primary-foreground/10 transition-colors"
            >
              Comprar no Atacado
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroBanner;
