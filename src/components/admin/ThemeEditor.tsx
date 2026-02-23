import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, RotateCcw, Palette, Type, SlidersHorizontal, MessageSquare, Download, Upload, History, Check, ImageIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { DEFAULT_THEME, PRESET_LIST, type ThemeSettings, type ThemeColors } from '@/theme/defaultTheme';
import { migrateTheme } from '@/theme/themeSchema';
import { DISPLAY_FONTS, BODY_FONTS } from '@/theme/fontMap';
import { hslToHex, hexToHsl, checkContrast } from '@/theme/contrastUtils';
import { useTheme } from '@/components/ThemeProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import ImageUploadRow from '@/components/admin/theme-editor/ImageUploadRow';

// ─── Contrast Badge ────────────────────────────────────────
function ContrastBadge({ fg, bg }: { fg: string; bg: string }) {
  const result = checkContrast(fg, bg);
  return (
    <span className="inline-flex items-center gap-1 ml-2">
      <Badge variant={result.levelAA ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">
        {result.ratio}:1 {result.levelAA ? 'AA ✓' : 'Falha'}
      </Badge>
    </span>
  );
}

// ─── Color Picker Row ──────────────────────────────────────
function ColorRow({ label, hslValue, onChange, contrastAgainst }: {
  label: string; hslValue: string; onChange: (v: string) => void; contrastAgainst?: string;
}) {
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
        <span className="font-body text-sm font-medium text-foreground block">
          {label}
          {contrastAgainst && <ContrastBadge fg={hslValue} bg={contrastAgainst} />}
        </span>
        <span className="font-body text-xs text-muted-foreground">{hslValue}</span>
      </div>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────
interface ThemeEditorProps {
  onDraftChange?: (draft: ThemeSettings) => void;
}

// ─── Main Component ────────────────────────────────────────
const ThemeEditor = ({ onDraftChange }: ThemeEditorProps) => {
  const qc = useQueryClient();
  const { data: settings } = useStoreSettings();
  const { applyTheme } = useTheme();
  const [draft, setDraft] = useState<ThemeSettings>(DEFAULT_THEME);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings && !loaded) {
      const saved = settings.theme;
      if (saved) {
        const migrated = migrateTheme(saved);
        setDraft(migrated);
      }
      setLoaded(true);
    }
  }, [settings, loaded]);

  // Notify parent + apply preview
  const updateDraft = useCallback((next: ThemeSettings) => {
    setDraft(next);
    applyTheme(next);
    onDraftChange?.(next);
  }, [applyTheme, onDraftChange]);

  const updateColor = (key: keyof ThemeColors, value: string) => {
    const next = {
      ...draft,
      tokens: { ...draft.tokens, colors: { ...draft.tokens.colors, [key]: value } },
    };
    // Sync derived colors
    if (key === 'primary') {
      next.tokens.colors.ring = value;
    }
    if (key === 'border') {
      next.tokens.colors.input = value;
    }
    if (key === 'nude') {
      next.tokens.colors.secondary = value;
    }
    if (key === 'background') {
      next.tokens.colors.primary_foreground = value;
    }
    if (key === 'card') {
      next.tokens.colors.popover = value;
    }
    if (key === 'foreground') {
      next.tokens.colors.card_foreground = value;
      next.tokens.colors.popover_foreground = value;
    }
    updateDraft(next);
  };

  const updateFont = (key: 'display' | 'body', value: string) => {
    updateDraft({ ...draft, tokens: { ...draft.tokens, fonts: { ...draft.tokens.fonts, [key]: value } } });
  };

  const updateRadius = (value: number) => {
    updateDraft({ ...draft, tokens: { ...draft.tokens, radius: `${value}rem` } });
  };

  const updateTopBar = (patch: Partial<ThemeSettings['components']['topBar']>) => {
    updateDraft({ ...draft, components: { ...draft.components, topBar: { ...draft.components.topBar, ...patch } } });
  };

  const updateImage = (key: 'logo' | 'heroBanner', url: string) => {
    updateDraft({ ...draft, components: { ...draft.components, images: { ...draft.components.images, [key]: url } } });
  };

  const applyPreset = (preset: ThemeSettings) => {
    const next = { ...preset, revision: draft.revision, history: draft.history, meta: { ...preset.meta, updatedAt: draft.meta.updatedAt, updatedById: draft.meta.updatedById } };
    updateDraft(next);
    toast.info('Preset aplicado! Clique "Salvar" para confirmar.');
  };

  // Save via direct upsert (Edge Function can be used later)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const toSave = {
        ...draft,
        revision: draft.revision + 1,
        meta: { ...draft.meta, updatedAt: new Date().toISOString(), preset: draft.meta.preset || 'custom' },
      };
      const { error } = await supabase.from('store_settings').upsert(
        { key: 'theme', value: toSave as any },
        { onConflict: 'key' }
      );
      if (error) throw error;
      setDraft(toSave);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store_settings'] });
      toast.success('Tema salvo com sucesso!');
    },
    onError: () => toast.error('Erro ao salvar tema.'),
  });

  const resetTheme = () => {
    updateDraft(DEFAULT_THEME);
    toast.info('Tema restaurado ao padrão. Clique "Salvar" para confirmar.');
  };

  // Import / Export
  const exportTheme = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const migrated = migrateTheme(parsed);
        updateDraft(migrated);
        toast.success('Tema importado!');
      } catch {
        toast.error('Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const radiusValue = parseFloat(draft.tokens.radius) || 0.5;
  const bg = draft.tokens.colors.background;

  return (
    <div className="space-y-6">
      {/* Presets */}
      <section className="bg-card rounded-lg shadow-soft p-5 space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Presets</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESET_LIST.map(({ key, label, preset }) => (
            <button
              key={key}
              onClick={() => applyPreset(preset)}
              className="border border-border rounded-lg p-3 hover:border-primary transition-colors text-left space-y-2"
            >
              <span className="font-body text-sm font-medium text-foreground">{label}</span>
              <div className="flex gap-1">
                {[preset.tokens.colors.primary, preset.tokens.colors.background, preset.tokens.colors.foreground, preset.tokens.colors.accent].map((c, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border border-border" style={{ background: `hsl(${c})` }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      <Accordion type="multiple" defaultValue={['brand', 'bg', 'text', 'comp', 'fonts', 'radius', 'topbar', 'images']} className="space-y-3">
        {/* Brand Colors */}
        <AccordionItem value="brand" className="bg-card rounded-lg shadow-soft border-none">
          <AccordionTrigger className="px-5 py-4 font-display text-base font-semibold">
            <span className="flex items-center gap-2"><Palette className="w-4 h-4" /> Cores da Marca</span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="grid sm:grid-cols-3 gap-4">
              <ColorRow label="Principal" hslValue={draft.tokens.colors.primary} onChange={v => updateColor('primary', v)} contrastAgainst={bg} />
              <ColorRow label="Principal Clara" hslValue={draft.tokens.colors.primary_light} onChange={v => updateColor('primary_light', v)} />
              <ColorRow label="Brilho / Glow" hslValue={draft.tokens.colors.primary_glow} onChange={v => updateColor('primary_glow', v)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Background Colors */}
        <AccordionItem value="bg" className="bg-card rounded-lg shadow-soft border-none">
          <AccordionTrigger className="px-5 py-4 font-display text-base font-semibold">Cores de Fundo</AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="grid sm:grid-cols-3 gap-4">
              <ColorRow label="Fundo Geral" hslValue={draft.tokens.colors.background} onChange={v => updateColor('background', v)} />
              <ColorRow label="Cards / Painéis" hslValue={draft.tokens.colors.card} onChange={v => updateColor('card', v)} />
              <ColorRow label="Tom Nude" hslValue={draft.tokens.colors.nude} onChange={v => updateColor('nude', v)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Text Colors */}
        <AccordionItem value="text" className="bg-card rounded-lg shadow-soft border-none">
          <AccordionTrigger className="px-5 py-4 font-display text-base font-semibold">Cores de Texto</AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <ColorRow label="Texto Principal" hslValue={draft.tokens.colors.foreground} onChange={v => updateColor('foreground', v)} contrastAgainst={bg} />
              <ColorRow label="Texto Secundário" hslValue={draft.tokens.colors.muted_foreground} onChange={v => updateColor('muted_foreground', v)} contrastAgainst={bg} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Complementary */}
        <AccordionItem value="comp" className="bg-card rounded-lg shadow-soft border-none">
          <AccordionTrigger className="px-5 py-4 font-display text-base font-semibold">Complementares</AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="grid sm:grid-cols-3 gap-4">
              <ColorRow label="Destaque (Gold)" hslValue={draft.tokens.colors.accent} onChange={v => updateColor('accent', v)} />
              <ColorRow label="Footer / Escuro" hslValue={draft.tokens.colors.charcoal} onChange={v => updateColor('charcoal', v)} />
              <ColorRow label="Bordas" hslValue={draft.tokens.colors.border} onChange={v => updateColor('border', v)} />
              <ColorRow label="Destrutivo" hslValue={draft.tokens.colors.destructive} onChange={v => updateColor('destructive', v)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Fonts */}
        <AccordionItem value="fonts" className="bg-card rounded-lg shadow-soft border-none">
          <AccordionTrigger className="px-5 py-4 font-display text-base font-semibold">
            <span className="flex items-center gap-2"><Type className="w-4 h-4" /> Fontes</span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="font-body text-sm">Fonte dos Títulos</Label>
                <Select value={draft.tokens.fonts.display} onValueChange={v => updateFont('display', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISPLAY_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-lg" style={{ fontFamily: `'${draft.tokens.fonts.display}', serif` }}>
                  Amostra de título elegante
                </p>
              </div>
              <div>
                <Label className="font-body text-sm">Fonte do Corpo</Label>
                <Select value={draft.tokens.fonts.body} onValueChange={v => updateFont('body', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BODY_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-sm" style={{ fontFamily: `'${draft.tokens.fonts.body}', sans-serif` }}>
                  Texto de corpo para leitura confortável.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Radius */}
        <AccordionItem value="radius" className="bg-card rounded-lg shadow-soft border-none">
          <AccordionTrigger className="px-5 py-4 font-display text-base font-semibold">
            <span className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Cantos</span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="flex items-center gap-4 max-w-md">
              <Slider value={[radiusValue]} onValueChange={([v]) => updateRadius(v)} min={0} max={1.5} step={0.125} className="flex-1" />
              <span className="font-body text-sm text-muted-foreground w-16 text-right">{draft.tokens.radius}</span>
            </div>
            <div className="flex gap-3 mt-3">
              {[0, 0.375, 0.5, 0.75, 1].map(v => (
                <div
                  key={v}
                  onClick={() => updateRadius(v)}
                  className="w-12 h-12 border-2 border-primary cursor-pointer transition-transform hover:scale-110"
                  style={{ borderRadius: `${v}rem`, background: `hsl(${draft.tokens.colors.primary} / 0.15)` }}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Top Bar */}
        <AccordionItem value="topbar" className="bg-card rounded-lg shadow-soft border-none">
          <AccordionTrigger className="px-5 py-4 font-display text-base font-semibold">
            <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Barra Superior</span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 space-y-3">
            <div className="flex items-center gap-3">
              <Switch checked={draft.components.topBar.visible} onCheckedChange={v => updateTopBar({ visible: v })} />
              <Label className="font-body text-sm">Exibir barra superior</Label>
            </div>
            {draft.components.topBar.visible && (
              <div>
                <Label className="font-body text-sm">Texto da barra</Label>
                <Input value={draft.components.topBar.text} onChange={e => updateTopBar({ text: e.target.value })} className="font-body mt-1" />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Images */}
        <AccordionItem value="images" className="bg-card rounded-lg shadow-soft border-none">
          <AccordionTrigger className="px-5 py-4 font-display text-base font-semibold">
            <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Imagens</span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 space-y-5">
            <ImageUploadRow
              label="Logo da Marca"
              description="Recomendado: PNG transparente, 400×100px"
              value={draft.components.images?.logo || ''}
              onChange={url => updateImage('logo', url)}
              folder="logo"
              aspect={4}
            />
            <ImageUploadRow
              label="Hero Banner"
              description="Imagem principal da loja. Recomendado: 1920×800px"
              value={draft.components.images?.heroBanner || ''}
              onChange={url => updateImage('heroBanner', url)}
              folder="hero"
              aspect={1920 / 800}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* History */}
      {draft.history && draft.history.length > 0 && (
        <section className="bg-card rounded-lg shadow-soft p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
            <History className="w-4 h-4" /> Histórico
          </h2>
          <div className="space-y-2">
            {draft.history.map((entry, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
                <span className="font-body text-xs text-muted-foreground">
                  Rev {entry.revision} • {new Date(entry.savedAt).toLocaleString('pt-BR')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const restored = migrateTheme({ ...entry.theme, version: 2, revision: draft.revision, meta: draft.meta, history: draft.history });
                    updateDraft(restored);
                    toast.info('Versão restaurada. Clique "Salvar" para confirmar.');
                  }}
                >
                  Restaurar
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
          <Save className="w-4 h-4" /> Salvar Tema
        </Button>
        <Button variant="outline" onClick={resetTheme} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Restaurar Padrão
        </Button>
        <Button variant="outline" onClick={exportTheme} className="gap-2">
          <Download className="w-4 h-4" /> Exportar JSON
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
          <Upload className="w-4 h-4" /> Importar JSON
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={importTheme} className="hidden" />
      </div>
    </div>
  );
};

export default ThemeEditor;
