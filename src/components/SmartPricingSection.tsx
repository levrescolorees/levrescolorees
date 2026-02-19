import { motion } from 'framer-motion';
import { Package, Sparkles, Crown } from 'lucide-react';

const tiers = [
  {
    icon: Package,
    qty: '1 unidade',
    label: 'Varejo',
    desc: 'Preço normal para compra individual',
    highlight: false,
    accent: 'bg-secondary text-foreground',
    iconColor: 'text-muted-foreground',
  },
  {
    icon: Sparkles,
    qty: '6 unidades',
    label: 'Box 06',
    desc: 'Até 25% de desconto — ideal para começar',
    highlight: false,
    accent: 'bg-primary/10 text-primary',
    iconColor: 'text-primary',
  },
  {
    icon: Crown,
    qty: '12 unidades',
    label: 'Box 12',
    desc: 'Até 40% off — melhor custo-benefício',
    highlight: true,
    accent: 'bg-gradient-rose text-primary-foreground',
    iconColor: 'text-primary-foreground',
  },
];

const SmartPricingSection = () => (
  <section className="py-16 md:py-24 bg-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <span className="text-sm font-body tracking-[0.3em] uppercase text-primary mb-2 block">
          Como Funciona
        </span>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-3">
          Compra Inteligente
        </h2>
        <p className="font-body text-muted-foreground max-w-md mx-auto">
          Quanto mais você compra, mais economiza. O desconto é aplicado automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.label}
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
            className={`relative rounded-sm p-6 text-center transition-all ${
              tier.highlight
                ? 'bg-gradient-rose text-primary-foreground shadow-rose scale-[1.03]'
                : 'bg-card shadow-soft'
            }`}
          >
            {tier.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-charcoal text-[10px] font-body font-bold tracking-wider uppercase px-4 py-1 rounded-full">
                Mais Popular
              </span>
            )}
            <div
              className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${
                tier.highlight ? 'bg-primary-foreground/20' : 'bg-secondary'
              }`}
            >
              <tier.icon className={`w-6 h-6 ${tier.highlight ? 'text-primary-foreground' : 'text-primary'}`} />
            </div>
            <div
              className={`inline-block text-xs font-body font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-3 ${
                tier.highlight ? 'bg-primary-foreground/20 text-primary-foreground' : tier.accent
              }`}
            >
              {tier.label}
            </div>
            <h3
              className={`font-display text-2xl font-bold mb-2 ${
                tier.highlight ? 'text-primary-foreground' : 'text-foreground'
              }`}
            >
              {tier.qty}
            </h3>
            <p
              className={`text-sm font-body ${
                tier.highlight ? 'text-primary-foreground/80' : 'text-muted-foreground'
              }`}
            >
              {tier.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Visual step indicator */}
      <div className="hidden md:flex items-center justify-center gap-0 mt-8 max-w-3xl mx-auto">
        {['Compre 1', '→', 'Compre 6', '→', 'Compre 12'].map((step, i) => (
          <span
            key={i}
            className={`font-body text-sm ${
              i % 2 === 1 ? 'text-muted-foreground mx-4' : 'font-semibold text-foreground bg-secondary px-4 py-2 rounded-full'
            }`}
          >
            {step}
          </span>
        ))}
      </div>
    </div>
  </section>
);

export default SmartPricingSection;
