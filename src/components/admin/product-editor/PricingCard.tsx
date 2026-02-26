import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PricingCardProps {
  retail_price: string;
  cost_price: string;
  stock: string;
  rating: string;
  reviews_count: string;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

const PricingCard = ({ retail_price, cost_price, stock, rating, reviews_count, errors, onChange }: PricingCardProps) => {
  const margin = parseFloat(retail_price) > 0 && parseFloat(cost_price) > 0
    ? ((1 - parseFloat(cost_price) / parseFloat(retail_price)) * 100).toFixed(1)
    : null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-body font-semibold">Preço e Estoque</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <Label className="font-body text-xs">Preço Custo (R$)</Label>
            <Input
              type="number" step="0.01" value={cost_price}
              onChange={e => onChange('cost_price', e.target.value)}
              className="font-body"
            />
            {margin && <p className="text-[10px] text-muted-foreground font-body">Margem: {margin}%</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs">Preço Venda (R$) *</Label>
            <Input
              type="number" step="0.01" value={retail_price}
              onChange={e => onChange('retail_price', e.target.value)}
              className={`font-body ${errors.retail_price ? 'border-destructive' : ''}`}
            />
            {errors.retail_price && <p className="text-xs text-destructive font-body">{errors.retail_price}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs">Estoque</Label>
            <Input type="number" value={stock} onChange={e => onChange('stock', e.target.value)} className="font-body" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs">Rating</Label>
            <Input type="number" step="0.1" max="5" value={rating} onChange={e => onChange('rating', e.target.value)} className="font-body" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs">Reviews</Label>
            <Input type="number" value={reviews_count} onChange={e => onChange('reviews_count', e.target.value)} className="font-body" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingCard;
