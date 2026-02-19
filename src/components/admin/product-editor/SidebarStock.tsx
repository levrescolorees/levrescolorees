import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface VariantForStock { stock: string }

interface SidebarStockProps {
  stock: string;
  variants: VariantForStock[];
  ideal_for_resale: boolean;
  suggested_margin: string;
  onChange: (field: string, value: string | boolean) => void;
}

const LOW_STOCK_THRESHOLD = 5;

const SidebarStock = ({ stock, variants, ideal_for_resale, suggested_margin, onChange }: SidebarStockProps) => {
  const totalStock = variants.length > 0
    ? variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0)
    : parseInt(stock) || 0;

  const isLow = totalStock > 0 && totalStock < LOW_STOCK_THRESHOLD;
  const isOut = totalStock === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-body font-semibold">Estoque & Revenda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-body text-muted-foreground">Estoque total</span>
          <span className={`text-sm font-body font-semibold ${isOut ? 'text-destructive' : isLow ? 'text-amber-600' : 'text-foreground'}`}>
            {totalStock} un.
          </span>
        </div>

        {isLow && (
          <div className="flex items-center gap-1.5 text-xs font-body text-amber-600 bg-amber-50 rounded-md px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Estoque baixo
          </div>
        )}
        {isOut && (
          <div className="flex items-center gap-1.5 text-xs font-body text-destructive bg-destructive/10 rounded-md px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Sem estoque
          </div>
        )}

        <div className="border-t border-border pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="font-body text-xs cursor-pointer">Ideal para revenda</Label>
            </div>
            <Switch checked={ideal_for_resale} onCheckedChange={v => onChange('ideal_for_resale', v)} />
          </div>
          {ideal_for_resale && (
            <div className="space-y-1">
              <Label className="font-body text-xs">Margem sugerida (%)</Label>
              <Input
                type="number"
                value={suggested_margin}
                onChange={e => onChange('suggested_margin', e.target.value)}
                className="font-body h-8 text-xs"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SidebarStock;
