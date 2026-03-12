import { motion } from 'framer-motion';
import { Truck, ShieldCheck, Percent, Heart } from 'lucide-react';

const benefits = [
  { icon: Truck, title: 'Envio Rápido' },
  { icon: ShieldCheck, title: 'Compra Segura' },
  { icon: Percent, title: 'Desconto Progressivo' },
  { icon: Heart, title: 'Qualidade Premium' },
];

const BenefitsSection = () => (
  <section className="py-4 bg-gradient-to-r from-muted to-secondary">
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-center divide-x divide-rose-gold/30">
        {benefits.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-2.5 px-6 md:px-10 py-2"
          >
            <b.icon className="w-5 h-5 text-rose-gold" strokeWidth={1.5} />
            <span className="font-body text-sm font-medium text-foreground whitespace-nowrap">{b.title}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default BenefitsSection;
