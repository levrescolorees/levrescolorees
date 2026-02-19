import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BasicInfoCardProps {
  name: string;
  slug: string;
  sku: string;
  badge: string;
  short_description: string;
  description: string;
  isNew: boolean;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

const BasicInfoCard = ({ name, slug, sku, badge, short_description, description, isNew, errors, onChange }: BasicInfoCardProps) => {
  const handleNameChange = (value: string) => {
    onChange('name', value);
    if (isNew) {
      const s = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      onChange('slug', s);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-body font-semibold">Informações Básicas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="font-body text-xs">Nome *</Label>
            <Input value={name} onChange={e => handleNameChange(e.target.value)} className={`font-body ${errors.name ? 'border-destructive' : ''}`} />
            {errors.name && <p className="text-xs text-destructive font-body">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs">SKU</Label>
            <Input value={sku} onChange={e => onChange('sku', e.target.value)} className="font-body" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-xs">Badge</Label>
          <Input value={badge} onChange={e => onChange('badge', e.target.value)} placeholder="Mais Vendido, Novo, Oferta" className="font-body" />
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-xs">Descrição Curta</Label>
          <Input value={short_description} onChange={e => onChange('short_description', e.target.value)} className="font-body" />
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-xs">Descrição Completa</Label>
          <Textarea value={description} onChange={e => onChange('description', e.target.value)} rows={4} className="font-body" />
        </div>
      </CardContent>
    </Card>
  );
};

export default BasicInfoCard;
