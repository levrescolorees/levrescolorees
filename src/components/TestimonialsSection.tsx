import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  { name: 'Mariana S.', text: 'Os glosses são incríveis! Duração incrível e cores lindas. Já comprei o Box 12 para revender.', stars: 5, tag: 'Revendedora' },
  { name: 'Juliana C.', text: 'Melhor lip tint que já usei. Não resseca e a cor é perfeita. Super recomendo!', stars: 5, tag: 'Cliente' },
  { name: 'Ana Paula R.', text: 'Comprei o Box 06 para testar e amei tanto que já fiz o pedido do Box 12. Qualidade premium!', stars: 5, tag: 'Revendedora' },
];

const TestimonialsSection = () => (
  <section className="py-16 md:py-24 bg-secondary/50">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <span className="text-sm font-body tracking-[0.3em] uppercase text-primary mb-2 block">Depoimentos</span>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">O que dizem nossas clientes</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="bg-card p-6 rounded-sm shadow-soft"
          >
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: t.stars }).map((_, j) => (
                <Star key={j} className="w-4 h-4 fill-gold text-gold" />
              ))}
            </div>
            <p className="text-sm font-body text-foreground leading-relaxed mb-4">"{t.text}"</p>
            <div className="flex items-center justify-between">
              <span className="font-body text-sm font-semibold text-foreground">{t.name}</span>
              <span className="text-[10px] font-body tracking-wider uppercase bg-secondary text-muted-foreground px-2 py-1 rounded-sm">{t.tag}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
