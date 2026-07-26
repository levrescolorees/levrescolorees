import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageUploadRow from './ImageUploadRow';
import type { HeroSlide, ThemeHero } from '@/theme/defaultTheme';

interface Props {
  value: ThemeHero;
  onChange: (next: ThemeHero) => void;
}

const genId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptySlide = (): HeroSlide => ({
  id: genId(),
  image: '',
  imageMobile: '',
  headline: 'Seu novo título aqui',
  subheadline: 'Fale sobre a coleção, promoção ou novidade.',
  ctaText: 'Comprar Agora',
  ctaLink: '/colecoes',
  ctaSecondaryText: '',
  ctaSecondaryLink: '',
  alignment: 'left',
  kicker: '',
});

export default function HeroSlidesEditor({ value, onChange }: Props) {
  const slides = value.slides || [];

  const updateSlide = (idx: number, patch: Partial<HeroSlide>) => {
    const next = slides.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...value, slides: next });
  };

  const addSlide = () => {
    onChange({ ...value, slides: [...slides, emptySlide()] });
  };

  const removeSlide = (idx: number) => {
    onChange({ ...value, slides: slides.filter((_, i) => i !== idx) });
  };

  const duplicateSlide = (idx: number) => {
    const copy = { ...slides[idx], id: genId() };
    const next = [...slides];
    next.splice(idx + 1, 0, copy);
    onChange({ ...value, slides: next });
  };

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ ...value, slides: next });
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/30 rounded-md">
        <div className="flex items-center gap-2">
          <Switch
            checked={value.autoplay}
            onCheckedChange={(v) => onChange({ ...value, autoplay: v })}
          />
          <Label className="font-body text-sm">Autoplay</Label>
        </div>
        {value.autoplay && (
          <div className="flex items-center gap-2">
            <Label className="font-body text-sm">Intervalo:</Label>
            <Input
              type="number"
              min={2}
              max={30}
              step={1}
              value={Math.round((value.intervalMs || 5000) / 1000)}
              onChange={(e) =>
                onChange({
                  ...value,
                  intervalMs: Math.max(2000, Number(e.target.value) * 1000 || 5000),
                })
              }
              className="w-20 h-9"
            />
            <span className="font-body text-xs text-muted-foreground">segundos</span>
          </div>
        )}
        <span className="ml-auto font-body text-xs text-muted-foreground">
          {slides.length} {slides.length === 1 ? 'slide' : 'slides'}
        </span>
      </div>

      {/* Empty state */}
      {slides.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <p className="font-body text-sm text-muted-foreground mb-3">
            Nenhum slide criado. A home usará o banner padrão.
          </p>
          <Button onClick={addSlide} className="gap-2">
            <Plus className="w-4 h-4" /> Criar primeiro slide
          </Button>
        </div>
      )}

      {/* Slides */}
      {slides.map((slide, idx) => (
        <div key={slide.id} className="border border-border rounded-lg p-4 space-y-4 bg-background">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-foreground">
              Slide {idx + 1}
            </h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => moveSlide(idx, -1)}
                disabled={idx === 0}
                title="Mover para cima"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => moveSlide(idx, 1)}
                disabled={idx === slides.length - 1}
                title="Mover para baixo"
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => duplicateSlide(idx)} title="Duplicar">
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSlide(idx)}
                title="Remover"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <ImageUploadRow
            label="Imagem de fundo"
            description="Recomendado: 1920×800px, JPG"
            value={slide.image}
            onChange={(url) => updateSlide(idx, { image: url })}
            folder={`hero/slides/${slide.id}`}
            aspect={1920 / 800}
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="font-body text-sm">Texto pequeno acima (opcional)</Label>
              <Input
                value={slide.kicker || ''}
                onChange={(e) => updateSlide(idx, { kicker: e.target.value })}
                placeholder="Ex.: Nova Coleção 2025"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="font-body text-sm">Alinhamento do texto</Label>
              <Select
                value={slide.alignment}
                onValueChange={(v) => updateSlide(idx, { alignment: v as HeroSlide['alignment'] })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="font-body text-sm">Título principal</Label>
            <Input
              value={slide.headline}
              onChange={(e) => updateSlide(idx, { headline: e.target.value })}
              placeholder="Seus lábios, sua assinatura."
              className="mt-1"
            />
          </div>

          <div>
            <Label className="font-body text-sm">Subtítulo</Label>
            <Input
              value={slide.subheadline}
              onChange={(e) => updateSlide(idx, { subheadline: e.target.value })}
              placeholder="Descreva a coleção ou oferta em uma frase."
              className="mt-1"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="font-body text-sm">Botão principal — texto</Label>
              <Input
                value={slide.ctaText}
                onChange={(e) => updateSlide(idx, { ctaText: e.target.value })}
                placeholder="Comprar Agora"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="font-body text-sm">Botão principal — link</Label>
              <Input
                value={slide.ctaLink}
                onChange={(e) => updateSlide(idx, { ctaLink: e.target.value })}
                placeholder="/colecoes"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="font-body text-sm">Botão secundário — texto (opcional)</Label>
              <Input
                value={slide.ctaSecondaryText || ''}
                onChange={(e) => updateSlide(idx, { ctaSecondaryText: e.target.value })}
                placeholder="Comprar no Atacado"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="font-body text-sm">Botão secundário — link (opcional)</Label>
              <Input
                value={slide.ctaSecondaryLink || ''}
                onChange={(e) => updateSlide(idx, { ctaSecondaryLink: e.target.value })}
                placeholder="/atacado"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      ))}

      {slides.length > 0 && (
        <Button onClick={addSlide} variant="outline" className="w-full gap-2">
          <Plus className="w-4 h-4" /> Adicionar slide
        </Button>
      )}
    </div>
  );
}
