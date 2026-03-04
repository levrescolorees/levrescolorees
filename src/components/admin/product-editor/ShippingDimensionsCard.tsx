import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Package } from 'lucide-react';

interface Props {
  weight: string;
  height: string;
  width: string;
  length: string;
  onChange: (field: string, value: string) => void;
}

const ShippingDimensionsCard = ({ weight, height, width, length, onChange }: Props) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" /> Peso e Dimensões
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-body text-xs text-muted-foreground">
          Necessários para cotação de frete via SuperFrete.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="font-body text-xs font-medium text-foreground">Peso (kg)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={weight}
              onChange={e => onChange('weight', e.target.value)}
              placeholder="0.30"
              className="font-body mt-1"
            />
          </div>
          <div>
            <label className="font-body text-xs font-medium text-foreground">Altura (cm)</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={height}
              onChange={e => onChange('height', e.target.value)}
              placeholder="2"
              className="font-body mt-1"
            />
          </div>
          <div>
            <label className="font-body text-xs font-medium text-foreground">Largura (cm)</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={width}
              onChange={e => onChange('width', e.target.value)}
              placeholder="11"
              className="font-body mt-1"
            />
          </div>
          <div>
            <label className="font-body text-xs font-medium text-foreground">Comprimento (cm)</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={length}
              onChange={e => onChange('length', e.target.value)}
              placeholder="16"
              className="font-body mt-1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShippingDimensionsCard;
