import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export interface VariantRow {
  id?: string;
  name: string;
  sku: string;
  stock: string;
  price_override: string;
  images: string[];
}

interface VariantsCardProps {
  variants: VariantRow[];
  onChange: (variants: VariantRow[]) => void;
}

const VariantsCard = ({ variants, onChange }: VariantsCardProps) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const updateVariant = (idx: number, field: keyof VariantRow, value: string | string[]) => {
    const arr = [...variants];
    (arr[idx] as any)[field] = value;
    onChange(arr);
  };

  const addVariant = () => {
    onChange([...variants, { name: '', sku: '', stock: '0', price_override: '', images: [] }]);
    setExpandedIdx(variants.length);
  };

  const removeVariant = (idx: number) => {
    onChange(variants.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-body font-semibold">Variantes ({variants.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={addVariant} className="font-body text-xs">
            <Plus className="w-3 h-3 mr-1" /> Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {variants.length === 0 && (
          <p className="text-xs font-body text-muted-foreground py-2">Nenhuma variante. Adicione cores, modelos, etc.</p>
        )}
        {variants.map((v, i) => (
          <div key={i} className="border border-border rounded-lg">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
            >
              <div className="flex items-center gap-3">
                <span className="font-body text-sm font-medium text-foreground">{v.name || `Variante ${i + 1}`}</span>
                {v.sku && <span className="text-xs font-body text-muted-foreground">SKU: {v.sku}</span>}
                <span className="text-xs font-body text-muted-foreground">Est: {v.stock}</span>
                {v.price_override && <span className="text-xs font-body text-primary">R$ {v.price_override}</span>}
              </div>
              {expandedIdx === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
            {expandedIdx === i && (
              <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="font-body text-xs">Nome</Label>
                    <Input value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} placeholder="Ex: Rosa Nude" className="font-body" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-body text-xs">SKU</Label>
                    <Input value={v.sku} onChange={e => updateVariant(i, 'sku', e.target.value)} className="font-body" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-body text-xs">Estoque</Label>
                    <Input type="number" value={v.stock} onChange={e => updateVariant(i, 'stock', e.target.value)} className="font-body" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-body text-xs">Preço Override (R$)</Label>
                    <Input type="number" step="0.01" value={v.price_override} onChange={e => updateVariant(i, 'price_override', e.target.value)} placeholder="Opcional" className="font-body" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive font-body text-xs">
                        <Trash2 className="w-3 h-3 mr-1" /> Remover variante
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover variante?</AlertDialogTitle>
                        <AlertDialogDescription>A variante "{v.name || `Variante ${i + 1}`}" será removida.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeVariant(i)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default VariantsCard;
