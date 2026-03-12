import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Camila Rodrigues',
    city: 'São Paulo, SP',
    text: 'Comecei revendendo com o Box 06 e em 2 meses já estava comprando o Box 12. Minhas clientes amam a qualidade!',
    initials: 'CR',
  },
  {
    name: 'Juliana Mendes',
    city: 'Belo Horizonte, MG',
    text: 'A margem de lucro é incrível! Revendo cada unidade por mais que o dobro do que paguei. Melhor investimento que fiz.',
    initials: 'JM',
  },
  {
    name: 'Fernanda Lima',
    city: 'Curitiba, PR',
    text: 'O suporte é excepcional e os produtos vendem sozinhos. Já tenho clientas fixas que pedem todo mês!',
    initials: 'FL',
  },
];

const ResellersTestimonials = () => {
  return (
    <section className="py-16 md:py-24 bg-rose-glow/10">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-sm font-body tracking-[0.3em] uppercase text-primary mb-3 block">
            Prova Social
          </span>
          <h2 className="font-display text-2xl md:text-4xl font-semibold text-foreground">
            Revendedoras que confiam na <span className="italic text-primary">Lèvres</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-card rounded-sm p-6 shadow-soft text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="font-display text-lg font-bold text-primary">{t.initials}</span>
              </div>
              <div className="flex justify-center gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="font-body text-sm text-muted-foreground leading-relaxed mb-4 italic">
                "{t.text}"
              </p>
              <p className="font-body text-sm font-semibold text-foreground">{t.name}</p>
              <p className="font-body text-xs text-muted-foreground">{t.city}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResellersTestimonials;
