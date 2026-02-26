import { useState } from 'react';
import { Star, Minus, Plus, ShoppingBag, Award, Truck, ShieldCheck } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatCurrency, getSmartPriceFromRules, type DBPriceRule } from '@/hooks/useProducts';
import type { PriceRuleRow } from './PriceRulesCard';
import type { VariantRow } from './VariantsCard';

interface ProductPreviewDrawerProps {
  open: boolean;
  onClose: () => void;
  name: string;
  images: string[];
  retail_price: string;
  description: string;
  short_description: string;
  badge: string;
  rating: string;
  reviews_count: string;
  ideal_for_resale: boolean;
  suggested_margin: string;
  variants: VariantRow[];
  priceRules: PriceRuleRow[];
}

const ProductPreviewDrawer = ({
  open, onClose, name, images, retail_price, description, short_description,
  badge, rating, reviews_count, ideal_for_resale, suggested_margin,
  variants, priceRules,
}: ProductPreviewDrawerProps) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);

  const retail = parseFloat(retail_price) || 0;
  const colors = variants.map(v => v.name).filter(Boolean);
  const color = selectedColor || colors[0] || 'Padrão';

  const dbRules: DBPriceRule[] = priceRules
    .filter(r => r.is_active && r.price && r.min_quantity)
    .map(r => ({
      id: '', product_id: '', min_quantity: parseInt(r.min_quantity) || 0,
      price: parseFloat(r.price) || 0, label: r.label, is_active: true,
    }));

  const smart = getSmartPriceFromRules(retail, dbRules, quantity);
  const box06 = getSmartPriceFromRules(retail, dbRules, 6);
  const box12 = getSmartPriceFromRules(retail, dbRules, 12);

  const pricingTiers = [
    { qty: '1 un.', price: retail, label: 'Varejo', active: quantity < 6, discount: 0 },
    { qty: '6 un.', price: box06.price, label: 'Box 06', discount: box06.discount, active: quantity >= 6 && quantity < 12 },
    { qty: '12 un.', price: box12.price, label: 'Box 12', discount: box12.discount, active: quantity >= 12 },
  ];

  const mainImage = images[0];

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-body text-sm">Preview da Página de Produto</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Gallery */}
          <div className="space-y-2">
            {images.length > 0 ? (
              <div className="aspect-square rounded-lg overflow-hidden bg-secondary">
                <img src={images[selectedImage] || images[0]} alt={name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                <p className="text-xs text-muted-foreground font-body">Sem imagem</p>
              </div>
            )}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.slice(0, 5).map((url, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={`aspect-square rounded-md overflow-hidden bg-secondary border-2 transition-colors cursor-pointer ${selectedImage === i ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          {badge && (
            <span className="inline-block bg-primary text-primary-foreground text-[10px] font-body font-bold tracking-wider uppercase px-3 py-1.5 rounded-sm">
              {badge}
            </span>
          )}
          <h2 className="font-display text-xl font-semibold text-foreground">{name || 'Nome do Produto'}</h2>

          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(parseFloat(rating) || 0) ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />
              ))}
            </div>
            <span className="text-xs font-body text-muted-foreground">{rating} ({reviews_count})</span>
          </div>

          {/* Price */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-2xl font-bold text-foreground">{formatCurrency(smart.price)}</span>
              {smart.discount > 0 && (
                <>
                  <span className="text-sm font-body text-muted-foreground line-through">{formatCurrency(retail)}</span>
                  <span className="bg-primary/10 text-primary text-xs font-body font-bold px-2 py-0.5 rounded-sm">-{smart.discount}%</span>
                </>
              )}
            </div>
            <p className="text-xs font-body text-primary font-medium">{smart.label}</p>
          </div>

          {/* Pricing table */}
          <div className="bg-secondary rounded-lg p-3 space-y-1.5">
            <h3 className="font-body text-[10px] font-bold tracking-wider uppercase text-muted-foreground mb-2">Tabela de Preços</h3>
            {pricingTiers.map(tier => (
              <div key={tier.label} className={`flex items-center justify-between py-1.5 px-2.5 rounded-sm text-xs ${tier.active ? 'bg-primary/10 border border-primary/20' : ''}`}>
                <span className="font-body font-medium">{tier.qty} — {tier.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-body font-semibold">{formatCurrency(tier.price)}</span>
                  {tier.discount > 0 && <span className="text-primary font-bold">-{tier.discount}%</span>}
                </div>
              </div>
            ))}
          </div>

          {ideal_for_resale && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 flex items-start gap-2">
              <Award className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-body text-xs font-semibold">Ideal para Revendedores</p>
                <p className="font-body text-[10px] text-muted-foreground">Margem sugerida: {suggested_margin}%</p>
              </div>
            </div>
          )}

          {/* Colors */}
          {colors.length > 0 && (
            <div>
              <h3 className="font-body text-xs font-semibold mb-2">Cor: {color}</h3>
              <div className="flex flex-wrap gap-1.5">
                {colors.map(c => (
                  <button key={c} onClick={() => setSelectedColor(c)}
                    className={`px-2.5 py-1 rounded-sm text-xs font-body transition-colors ${c === color ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'}`}
                  >{c}</button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity simulator */}
          <div>
            <h3 className="font-body text-xs font-semibold mb-2">Quantidade</h3>
            <div className="flex items-center gap-1">
              {[1, 6, 12].map(q => (
                <button key={q} onClick={() => setQuantity(q)} className={`px-3 py-1.5 rounded-sm text-xs font-body ${quantity === q ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  {q} un.
                </button>
              ))}
              <div className="flex items-center gap-1 ml-3 bg-secondary rounded-sm px-1.5">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-1.5"><Minus className="w-3 h-3" /></button>
                <span className="font-body text-xs font-semibold w-6 text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-1.5"><Plus className="w-3 h-3" /></button>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-rose text-primary-foreground font-body font-semibold text-xs tracking-wider uppercase px-6 py-3 rounded-sm text-center">
            <ShoppingBag className="w-4 h-4 inline mr-2" />
            Adicionar • {formatCurrency(smart.price * quantity)}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-body text-muted-foreground">
            <div className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-primary" /> Envio em 24h</div>
            <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Compra segura</div>
          </div>

          {description && (
            <div className="border-t border-border pt-3">
              <h3 className="font-display text-sm font-semibold mb-2">Detalhes</h3>
              <p className="font-body text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductPreviewDrawer;
