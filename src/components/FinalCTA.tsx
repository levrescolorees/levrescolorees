import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const FinalCTA = () => (
  <section className="py-20 md:py-28 bg-gradient-rose relative overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--rose-glow)/0.3),transparent_60%)]" />
    <div className="container mx-auto px-4 relative z-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
          Pronta para brilhar?
        </h2>
        <p className="text-primary-foreground/80 font-body text-base md:text-lg max-w-lg mx-auto mb-8">
          Compre no varejo ou monte seu kit de revenda com desconto exclusivo. Sua jornada começa agora.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/colecoes"
            className="inline-flex items-center justify-center bg-primary-foreground text-primary font-body font-semibold text-sm tracking-wider uppercase px-8 py-4 rounded-sm hover:bg-primary-foreground/90 transition-colors"
          >
            Ver Coleções
          </Link>
          <Link
            to="/atacado"
            className="inline-flex items-center justify-center border-2 border-primary-foreground text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-8 py-4 rounded-sm hover:bg-primary-foreground/10 transition-colors"
          >
            Programa Revendedora
          </Link>
        </div>
      </motion.div>
    </div>
  </section>
);

export default FinalCTA;
