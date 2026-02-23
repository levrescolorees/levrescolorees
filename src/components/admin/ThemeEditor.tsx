import { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, Palette, Type, SlidersHorizontal, MessageSquare } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreSettings, ThemeSettings, ThemeColors } from '@/hooks/useStoreSettings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// ── Defaults ──────────────────────────────────────────
const DEFAULT_THEME: ThemeSettings = {
  colors: {
    primary: '328 100% 45%',
    primary_light: '328 85% 62%',
    primary_glow: '328 88% 73%',
    background: '30 25% 97%',
    card: '30 20% 99%',
    foreground: '0 0% 8%',
    muted_foreground: '0 0% 40%',
    accent: '30 40% 50%',
    nude: '20 30% 90%',
    charcoal: '0 0% 15%',
    border: '20 15% 88%',
    destructive: '0 84.2% 60.2%',
  },
  fonts: { display: 'Playfair Display', body: 'Inter' },
  radius: '0.5rem',
  topBar: { visible: true, text: 'FRETE GRÁTIS acima de R$299 • Compre no Atacado e economize até 40%' },
};

const DISPLAY_FONTS = ['Playfair Display', 'Cormorant Garamond', 'Lora', 'Merriweather', 'Libre Baskerville'];
const BODY_FONTS = ['Inter', 'Poppins', 'Nunito', 'Open Sans', 'Lato'];

// ── HSL <-> Hex converters ─────────────────────────────
function hslToHex(hslStr: string): string {
  const parts = hslStr.replace(/%/g, '').split(/\s+/).map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return '#000000';
  const [h, s, l] = parts;
  const sN = s / 100;
  const lN = l / 100;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lN - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// ── Color Picker Row ──────────────────────────────────
function ColorRow({ label, hslValue, onChange }: { label: string; hslValue: string; onChange: (v: string) => void }) {
  const hex = hslToHex(hslValue);
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={hex}
        onChange={e => onChange(hexToHsl(e.target.value))}
        className="w-10 h-10 rounded-md border border-border cursor-pointer shrink-0"
      />
      <div className="flex-1 min-w-0">
        <span className="font-body text-sm font-medium text-foreground block">{label}</span>
        <span className="font-body text-xs text-muted-foreground">{hslValue}</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────
const ThemeEditor = () => {
  const qc = useQueryClient();
  const { data: settings } = useStoreSettings();
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (settings && !loaded) {
      const saved = settings.theme as ThemeSettings | undefined;
      if (saved) {
        setTheme({
          colors: { ...DEFAULT_THEME.colors, ...saved.colors },
          fonts: { ...DEFAULT_THEME.fonts, ...saved.fonts },
          radius: saved.radius || DEFAULT_THEME.radius,
          topBar: { ...DEFAULT_THEME.topBar, ...saved.topBar },
        });
      }
      setLoaded(true);
    }
  }, [settings, loaded]);

  // Live preview: apply changes to DOM as user edits
  const applyLivePreview = useCallback((t: ThemeSettings) => {
    const root = document.documentElement;
    const cssMap: Record<string, string> = {
      primary: '--primary', primary_light: '--rose-light', primary_glow: '--rose-glow',
      background: '--background', card: '--card', foreground: '--foreground',
      muted_foreground: '--muted-foreground', accent: '--accent', nude: '--nude',
      charcoal: '--charcoal', border: '--border', destructive: '--destructive',
    };
    Object.entries(cssMap).forEach(([key, cssVar]) => {
      const val = t.colors[key as keyof ThemeColors];
      if (val) root.style.setProperty(cssVar, val);
    });
    // Sync derived
    root.style.setProperty('--ring', t.colors.primary);
    root.style.setProperty('--rose', t.colors.primary);
    root.style.setProperty('--input', t.colors.border);
    root.style.setProperty('--secondary', t.colors.nude);
    root.style.setProperty('--radius', t.radius);
  }, []);

  const updateColor = (key: keyof ThemeColors, value: string) => {
    const next = { ...theme, colors: { ...theme.colors, [key]: value } };
    setTheme(next);
    applyLivePreview(next);
  };

  const updateFont = (key: 'display' | 'body', value: string) => {
    setTheme(prev => ({ ...prev, fonts: { ...prev.fonts, [key]: value } }));
  };

  const updateRadius = (value: number) => {
    const next = { ...theme, radius: `${value}rem` };
    setTheme(next);
    applyLivePreview(next);
  };

  const updateTopBar = (patch: Partial<ThemeSettings['topBar']>) => {
    setTheme(prev => ({ ...prev, topBar: { ...prev.topBar, ...patch } }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('store_settings').upsert({ key: 'theme', value: theme as any }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store_settings'] });
      toast.success('Tema salvo com sucesso!');
    },
    onError: () => toast.error('Erro ao salvar tema.'),
  });

  const resetTheme = () => {
    setTheme(DEFAULT_THEME);
    applyLivePreview(DEFAULT_THEME);
    toast.info('Tema restaurado ao padrão. Clique "Salvar" para confirmar.');
  };

  const radiusValue = parseFloat(theme.radius) || 0.5;

  return (
    <div className="space-y-8">
      {/* ── Cores da Marca ── */}
      <section className="bg-card rounded-lg shadow-soft p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Palette className="w-5 h-5" /> Cores da Marca
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <ColorRow label="Cor Principal" hslValue={theme.colors.primary} onChange={v => updateColor('primary', v)} />
          <ColorRow label="Principal Clara" hslValue={theme.colors.primary_light} onChange={v => updateColor('primary_light', v)} />
          <ColorRow label="Brilho / Glow" hslValue={theme.colors.primary_glow} onChange={v => updateColor('primary_glow', v)} />
        </div>
      </section>

      {/* ── Cores de Fundo ── */}
      <section className="bg-card rounded-lg shadow-soft p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Cores de Fundo</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <ColorRow label="Fundo Geral" hslValue={theme.colors.background} onChange={v => updateColor('background', v)} />
          <ColorRow label="Cards / Painéis" hslValue={theme.colors.card} onChange={v => updateColor('card', v)} />
          <ColorRow label="Tom Nude" hslValue={theme.colors.nude} onChange={v => updateColor('nude', v)} />
        </div>
      </section>

      {/* ── Cores de Texto ── */}
      <section className="bg-card rounded-lg shadow-soft p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Cores de Texto</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <ColorRow label="Texto Principal" hslValue={theme.colors.foreground} onChange={v => updateColor('foreground', v)} />
          <ColorRow label="Texto Secundário" hslValue={theme.colors.muted_foreground} onChange={v => updateColor('muted_foreground', v)} />
        </div>
      </section>

      {/* ── Complementares ── */}
      <section className="bg-card rounded-lg shadow-soft p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Cores Complementares</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <ColorRow label="Destaque (Gold)" hslValue={theme.colors.accent} onChange={v => updateColor('accent', v)} />
          <ColorRow label="Footer / Escuro" hslValue={theme.colors.charcoal} onChange={v => updateColor('charcoal', v)} />
          <ColorRow label="Bordas" hslValue={theme.colors.border} onChange={v => updateColor('border', v)} />
        </div>
      </section>

      {/* ── Fontes ── */}
      <section className="bg-card rounded-lg shadow-soft p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Type className="w-5 h-5" /> Fontes
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="font-body text-sm">Fonte dos Títulos</Label>
            <Select value={theme.fonts.display} onValueChange={v => updateFont('display', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISPLAY_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="font-body text-sm">Fonte do Corpo</Label>
            <Select value={theme.fonts.body} onValueChange={v => updateFont('body', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BODY_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* ── Cantos ── */}
      <section className="bg-card rounded-lg shadow-soft p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5" /> Arredondamento dos Cantos
        </h2>
        <div className="flex items-center gap-4 max-w-md">
          <Slider
            value={[radiusValue]}
            onValueChange={([v]) => updateRadius(v)}
            min={0}
            max={1.5}
            step={0.125}
            className="flex-1"
          />
          <span className="font-body text-sm text-muted-foreground w-16 text-right">{theme.radius}</span>
        </div>
        <div className="flex gap-3 mt-2">
          {[0, 0.375, 0.5, 0.75, 1].map(v => (
            <div
              key={v}
              onClick={() => updateRadius(v)}
              className="w-12 h-12 border-2 border-primary cursor-pointer"
              style={{ borderRadius: `${v}rem`, background: `hsl(${theme.colors.primary} / 0.15)` }}
            />
          ))}
        </div>
      </section>

      {/* ── Barra Superior ── */}
      <section className="bg-card rounded-lg shadow-soft p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-5 h-5" /> Barra Superior
        </h2>
        <div className="flex items-center gap-3">
          <Switch
            checked={theme.topBar.visible}
            onCheckedChange={v => updateTopBar({ visible: v })}
          />
          <Label className="font-body text-sm">Exibir barra superior</Label>
        </div>
        {theme.topBar.visible && (
          <div>
            <Label className="font-body text-sm">Texto da barra</Label>
            <Input
              value={theme.topBar.text}
              onChange={e => updateTopBar({ text: e.target.value })}
              className="font-body mt-1"
              placeholder="FRETE GRÁTIS acima de R$299..."
            />
          </div>
        )}
      </section>

      {/* ── Actions ── */}
      <div className="flex gap-3">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
          <Save className="w-4 h-4" /> Salvar Tema
        </Button>
        <Button variant="outline" onClick={resetTheme} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Restaurar Padrão
        </Button>
      </div>
    </div>
  );
};

export default ThemeEditor;
