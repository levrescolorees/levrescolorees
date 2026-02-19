import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, getSmartPriceFromRules, type DBPriceRule } from '@/hooks/useProducts';

export interface PriceRuleRow {
  id?: string;
  min_quantity: string;
  price: string;
  label: string;
  is_active: boolean;
}

interface PriceRulesCardProps {
  priceRules: PriceRuleRow[];
  retailPrice: string;
  onChange: (rules: PriceRuleRow[]) => void;
}

const PriceRulesCard = ({ priceRules, retailPrice, onChange }: PriceRulesCardProps) => {
  const addRule = () => {
    onChange([...priceRules, { min_quantity: '', price: '', label: '', is_active: true }]);
  };

  const updateRule = (idx: number, field: keyof PriceRuleRow, value: string | boolean) => {
    const arr = [...priceRules];
    (arr[idx] as any)[field] = value;
    onChange(arr);
  };

  const removeRule = (idx: number) => {
    onChange(priceRules.filter((_, i) => i !== idx));
  };

  // Simulator
  const retail = parseFloat(retailPrice) || 0;
  const dbRules: DBPriceRule[] = priceRules
    .filter(r => r.is_active && r.price && r.min_quantity)
    .map(r => ({
      id: '', product_id: '', min_quantity: parseInt(r.min_quantity) || 0,
      price: parseFloat(r.price) || 0, label: r.label, is_active: true,
    }));

  const simQuantities = [1, 6, 12];

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-body font-semibold">Regras de Preço ({priceRules.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={addRule} className="font-body text-xs">
            <Plus className="w-3 h-3 mr-1" /> Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rules table */}
          <div className="lg:col-span-2 space-y-3">
            {priceRules.length === 0 && (
              <p className="text-xs font-body text-muted-foreground py-2">Nenhuma regra de preço. O preço varejo será usado.</p>
            )}
            {priceRules.map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-3 border border-border rounded-lg">
                <div className="space-y-1 flex-shrink-0 w-20">
                  <Label className="font-body text-[10px]">Qtd Min</Label>
                  <Input type="number" value={r.min_quantity} onChange={e => updateRule(i, 'min_quantity', e.target.value)} className="font-body h-8 text-xs" />
                </div>
                <div className="space-y-1 flex-shrink-0 w-28">
                  <Label className="font-body text-[10px]">Preço (R$)</Label>
                  <Input type="number" step="0.01" value={r.price} onChange={e => updateRule(i, 'price', e.target.value)} className="font-body h-8 text-xs" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <Label className="font-body text-[10px]">Label</Label>
                  <Input value={r.label} onChange={e => updateRule(i, 'label', e.target.value)} placeholder="Box 06" className="font-body h-8 text-xs" />
                </div>
                <div className="flex flex-col items-center gap-1 pt-3">
                  <Switch checked={r.is_active} onCheckedChange={v => updateRule(i, 'is_active', v)} />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeRule(i)} className="mt-3 shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          {/* Simulator */}
          <div className="space-y-3">
            <h3 className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wider">Simulador</h3>
            <div className="space-y-2">
              {simQuantities.map(qty => {
                const result = getSmartPriceFromRules(retail, dbRules, qty);
                const total = result.price * qty;
                const economy = (retail * qty) - total;
                return (
                  <div key={qty} className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-xs font-medium">{qty} un.</span>
                      <span className="font-body text-xs text-muted-foreground">{result.label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-body text-sm font-semibold text-foreground">{formatCurrency(result.price)}/un</span>
                      <span className="font-body text-xs text-muted-foreground">Total: {formatCurrency(total)}</span>
                    </div>
                    {economy > 0 && (
                      <p className="text-[10px] font-body text-green-600 font-medium">
                        Economia: {formatCurrency(economy)} (-{result.discount}%)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceRulesCard;
