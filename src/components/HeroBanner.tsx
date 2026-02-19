import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import heroBanner from '@/assets/hero-banner.jpg';
import { useStoreSettings } from '@/hooks/useStoreSettings';

const HeroBanner = () => {
  const { data: settings } = useStoreSettings();
  const hero = settings?.hero;

  const headline = hero?.headline || 'Seus lábios, sua assinatura.';
  const subheadline = hero?.subheadline || 'Cores vibrantes, texturas irresistíveis. Do varejo ao atacado, encontre o mix perfeito para brilhar — ou revender.';
  const ctaText = hero?.cta_text || 'Comprar Agora';
  const ctaLink = hero?.cta_link || '/colecoes';

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
            {headline.includes(',') ? (
              <>
                {headline.split(',')[0]},<br />
                <span className="italic text-rose-glow">{headline.split(',').slice(1).join(',').trim()}</span>
              </>
            ) : headline}
          </h1>
          <p className="text-primary-foreground/80 text-base md:text-lg font-body leading-relaxed mb-8 max-w-md">
            {subheadline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to={ctaLink}
              className="inline-flex items-center justify-center bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-8 py-4 rounded-sm hover:opacity-90 transition-opacity shadow-rose"
            >
              {ctaText}
            </Link>
            <Link
              to="/atacado"
              className="inline-flex items-center justify-center border-2 border-primary-foreground/40 text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-8 py-4 rounded-sm hover:bg-primary-foreground/10 transition-colors"
            >
              Comprar no Atacado
            </Link>
          </div>

          {/* Trust badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-4 mt-8"
          >
            <div className="flex -space-x-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full bg-primary-foreground/20 border-2 border-primary-foreground/40" />
              ))}
            </div>
            <div>
              <p className="text-primary-foreground text-xs font-body font-semibold">+2.500 clientes satisfeitas</p>
              <p className="text-primary-foreground/60 text-[10px] font-body">⭐ 4.8/5 avaliação média</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroBanner;
