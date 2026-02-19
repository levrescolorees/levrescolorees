import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SidebarSEOProps {
  slug: string;
  seo_title: string;
  meta_description: string;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

const SidebarSEO = ({ slug, seo_title, meta_description, errors, onChange }: SidebarSEOProps) => {
  const displayTitle = seo_title || 'Título do Produto';
  const displayUrl = `levres.com.br/produto/${slug || 'slug'}`;
  const displayDesc = meta_description || 'Descrição do produto aparecerá aqui...';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-body font-semibold">SEO</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Google preview */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-0.5">
          <p className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview Google</p>
          <p className="text-sm font-body text-blue-700 truncate">{displayTitle}</p>
          <p className="text-xs font-body text-green-700 truncate">{displayUrl}</p>
          <p className="text-xs font-body text-muted-foreground line-clamp-2">{displayDesc}</p>
        </div>

        <div className="space-y-1.5">
          <Label className="font-body text-xs">Slug *</Label>
          <Input
            value={slug}
            onChange={e => onChange('slug', e.target.value)}
            className={`font-body h-8 text-xs ${errors.slug ? 'border-destructive' : ''}`}
          />
          {errors.slug && <p className="text-xs text-destructive font-body">{errors.slug}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-xs">SEO Title</Label>
          <Input value={seo_title} onChange={e => onChange('seo_title', e.target.value)} className="font-body h-8 text-xs" placeholder="Máx 60 caracteres" />
          <p className="text-[10px] font-body text-muted-foreground">{seo_title.length}/60</p>
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-xs">Meta Description</Label>
          <Textarea value={meta_description} onChange={e => onChange('meta_description', e.target.value)} rows={3} className="font-body text-xs" placeholder="Máx 160 caracteres" />
          <p className="text-[10px] font-body text-muted-foreground">{meta_description.length}/160</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SidebarSEO;
