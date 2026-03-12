import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { useStorefrontProducts, formatCurrency, getSmartPriceFromRules } from '@/hooks/useProducts';

const ProfitCalculator = () => {
  const { data: products } = useStorefrontProducts();
  const firstProduct = products?.[0];
  const [quantity, setQuantity] = useState(12);
  const [sellPrice, setSellPrice] = useState(14.9);

  if (!firstProduct) return null;

  const smart = getSmartPriceFromRules(firstProduct.retail_price, firstProduct.priceRules, quantity);
  const investimento = smart.price * quantity;
  const faturamento = sellPrice * quantity;
  const lucro = faturamento - investimento;
  const margem = investimento > 0 ? (lucro / investimento) * 100 : 0;

  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card border-2 border-primary/20 rounded-sm p-6 md:p-10 shadow-soft"
        >
          <div className="text-center mb-8">
            <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
              Calculadora de Lucro
            </h2>
            <p className="font-body text-sm text-muted-foreground mt-2">
              Simule seu ganho com base no produto: <strong>{firstProduct.name}</strong>
            </p>
          </div>

          {/* Quantity slider */}
          <div className="mb-6">
            <div className="flex justify-between items-baseline mb-3">
              <label className="font-body text-sm font-semibold text-foreground">Quantidade</label>
              <span className="font-display text-lg font-bold text-primary">{quantity} un.</span>
            </div>
            <Slider
              value={[quantity]}
              onValueChange={([v]) => setQuantity(v)}
              min={6}
              max={120}
              step={6}
            />
            <div className="flex justify-between font-body text-xs text-muted-foreground mt-1">
              <span>6 un.</span>
              <span>120 un.</span>
            </div>
          </div>

          {/* Sell price */}
          <div className="mb-8">
            <label className="font-body text-sm font-semibold text-foreground block mb-2">
              Preço de venda por unidade (R$)
            </label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={sellPrice}
              onChange={(e) => setSellPrice(Number(e.target.value))}
              className="font-body text-base"
            />
          </div>

          {/* Results */}
          <div className="bg-secondary rounded-sm p-5 space-y-3 mb-6">
            <div className="flex justify-between items-baseline">
              <span className="font-body text-sm text-muted-foreground">Você investe</span>
              <span className="font-display text-lg font-semibold text-foreground">{formatCurrency(investimento)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="font-body text-sm text-muted-foreground">Você fatura</span>
              <span className="font-display text-lg font-semibold text-foreground">{formatCurrency(faturamento)}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-baseline">
              <span className="font-body text-sm font-bold text-foreground">Lucro</span>
              <div className="text-right">
                <span className="font-display text-2xl font-bold text-primary">{formatCurrency(lucro)}</span>
                <span className={`ml-2 font-body text-sm font-bold ${margem >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  ({margem.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>

          <a
            href="https://wa.me/5500000000000?text=Oi!%20Quero%20comecar%20a%20revender%20Levres!"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-6 py-4 rounded-sm hover:opacity-90 transition-opacity shadow-rose"
          >
            Comece a Revender
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default ProfitCalculator;
