import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import box06Img from '@/assets/box-06.jpg';
import box12Img from '@/assets/box-12.jpg';
import collectionImg from '@/assets/collection-lipgloss.jpg';

const items = [
  { name: 'Box 06', desc: '6 unidades com desconto especial', img: box06Img, link: '/colecoes?filter=box06' },
  { name: 'Box 12', desc: '12 unidades - melhor preço', img: box12Img, link: '/colecoes?filter=box12' },
  { name: 'Mais Vendidos', desc: 'Os favoritos das clientes', img: collectionImg, link: '/colecoes?filter=bestsellers' },
];

const CollectionsSection = () => (
  <section className="py-16 md:py-24 bg-secondary/50">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <span className="text-sm font-body tracking-[0.3em] uppercase text-primary mb-2 block">Explore</span>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">Compre por Coleção</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
          >
            <Link to={item.link} className="group block relative overflow-hidden rounded-sm aspect-[4/5]">
              <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="font-display text-2xl font-semibold text-primary-foreground mb-1">{item.name}</h3>
                <p className="text-primary-foreground/70 text-sm font-body mb-3">{item.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-rose-glow text-sm font-body font-medium group-hover:gap-3 transition-all">
                  Ver Coleção <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default CollectionsSection;
