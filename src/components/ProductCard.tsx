import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ShoppingBag } from 'lucide-react';
import { Product, formatCurrency } from '@/data/products';
import { useCart } from '@/context/CartContext';
import collectionImg from '@/assets/collection-lipgloss.jpg';

interface ProductCardProps {
  product: Product;
  index?: number;
}

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const { addItem } = useCart();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="group"
    >
      <Link to={`/produto/${product.slug}`} className="block">
        <div className="relative overflow-hidden rounded-sm bg-secondary aspect-[3/4] mb-4">
          <img
            src={collectionImg}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
          {product.badge && (
            <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-body font-bold tracking-wider uppercase px-3 py-1.5 rounded-sm">
              {product.badge}
            </span>
          )}
          {product.idealForResale && (
            <span className="absolute top-3 right-3 bg-accent text-accent-foreground text-[10px] font-body font-bold tracking-wider uppercase px-3 py-1.5 rounded-sm">
              Ideal Revenda
            </span>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.preventDefault();
              addItem(product, 1, product.colors[0]);
            }}
            className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm text-foreground p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-soft"
          >
            <ShoppingBag className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-display text-base font-medium text-foreground group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-xs font-body text-muted-foreground">{product.shortDescription}</p>
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-gold text-gold" />
            <span className="text-xs font-body text-foreground font-medium">{product.rating}</span>
            <span className="text-xs font-body text-muted-foreground">({product.reviews})</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-body font-semibold text-foreground">{formatCurrency(product.retailPrice)}</span>
            <span className="text-xs font-body text-primary font-medium">
              a partir de {formatCurrency(product.box12Price)} no atacado
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
