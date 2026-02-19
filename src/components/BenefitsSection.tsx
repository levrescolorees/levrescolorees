import { motion } from 'framer-motion';
import { Truck, ShieldCheck, Percent, Heart } from 'lucide-react';

const benefits = [
  { icon: Truck, title: 'Envio Rápido', desc: 'Entrega em todo o Brasil em até 7 dias úteis' },
  { icon: ShieldCheck, title: 'Compra Segura', desc: 'Pagamento criptografado e garantia de satisfação' },
  { icon: Percent, title: 'Desconto Progressivo', desc: 'Quanto mais compra, mais economiza' },
  { icon: Heart, title: 'Qualidade Premium', desc: 'Produtos veganos e cruelty-free' },
];

const BenefitsSection = () => (
  <section className="py-16 md:py-20 bg-background">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {benefits.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary mb-4">
              <b.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display text-base font-semibold text-foreground mb-1">{b.title}</h3>
            <p className="text-sm font-body text-muted-foreground">{b.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default BenefitsSection;
