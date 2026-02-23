import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Monitor, Tablet, Smartphone, ShoppingBag, Star, Heart, Menu, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ThemeSettings } from '@/theme/defaultTheme';
import { DEFAULT_THEME, type ThemeColors } from '@/theme/defaultTheme';
import { getFontFamily, loadFont } from '@/theme/fontMap';

// Asset imports
import heroBanner from '@/assets/hero-banner.jpg';
import box06 from '@/assets/box-06.jpg';
import box12 from '@/assets/box-12.jpg';
import lipgloss from '@/assets/collection-lipgloss.jpg';

const VIEWPORTS = [
  { label: 'Desktop', width: 1280, icon: Monitor },
  { label: 'Tablet', width: 768, icon: Tablet },
  { label: 'Mobile', width: 375, icon: Smartphone },
] as const;

interface ThemePreviewFrameProps {
  draft: ThemeSettings | null;
}

// Helper to get image URL or fallback
const getImageUrl = (theme: ThemeSettings, key: 'logo' | 'heroBanner', fallback: string) => {
  const url = theme.components.images?.[key];
  return url && url.length > 0 ? url : fallback;
};

const COLOR_TO_CSS: Record<keyof ThemeColors, string> = {
  primary: '--primary',
  primary_light: '--rose-light',
  primary_glow: '--rose-glow',
  background: '--background',
  card: '--card',
  card_foreground: '--card-foreground',
  foreground: '--foreground',
  muted: '--muted',
  muted_foreground: '--muted-foreground',
  accent: '--accent',
  accent_foreground: '--accent-foreground',
  secondary: '--secondary',
  secondary_foreground: '--secondary-foreground',
  popover: '--popover',
  popover_foreground: '--popover-foreground',
  primary_foreground: '--primary-foreground',
  destructive: '--destructive',
  destructive_foreground: '--destructive-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  nude: '--nude',
  charcoal: '--charcoal',
};

function buildScopedStyle(theme: ThemeSettings): React.CSSProperties {
  const { colors, fonts, radius } = theme.tokens;
  const style: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(COLOR_TO_CSS)) {
    const value = colors[key as keyof ThemeColors];
    if (value) style[cssVar] = value;
  }
  style['--rose'] = colors.primary;
  style['--cream'] = colors.background;
  style['--font-display'] = getFontFamily(fonts.display);
  style['--font-body'] = getFontFamily(fonts.body);
  style['--radius'] = radius;
  return style as unknown as React.CSSProperties;
}

// ─── Mockup Components ────────────────────────────────────

const MockTopBar = ({ text }: { text: string }) => (
  <div className="w-full py-2 px-4 text-center text-xs font-medium tracking-wider"
    style={{ background: 'hsl(var(--charcoal))', color: 'hsl(var(--primary-foreground))' }}>
    {text}
  </div>
);

const MockHeader = ({ logoUrl }: { logoUrl?: string }) => (
  <header className="w-full py-4 px-6 flex items-center justify-between"
    style={{ background: 'hsl(var(--background))', borderBottom: '1px solid hsl(var(--border))' }}>
    <div className="flex items-center gap-3">
      <Menu className="w-5 h-5" style={{ color: 'hsl(var(--foreground))' }} />
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" className="h-8 max-w-[140px] object-contain" />
      ) : (
        <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'hsl(var(--foreground))' }}>
          Minha Loja
        </span>
      )}
    </div>
    <nav className="hidden sm:flex items-center gap-4 text-sm" style={{ fontFamily: 'var(--font-body)', color: 'hsl(var(--muted-foreground))' }}>
      <span>Produtos</span>
      <span>Coleções</span>
      <span>Atacado</span>
    </nav>
    <div className="flex items-center gap-3" style={{ color: 'hsl(var(--foreground))' }}>
      <Search className="w-4 h-4" />
      <User className="w-4 h-4" />
      <ShoppingBag className="w-4 h-4" />
    </div>
  </header>
);

const MockHero = ({ heroUrl }: { heroUrl: string }) => (
  <section className="w-full py-20 px-6 text-center relative overflow-hidden"
    style={{ minHeight: 280 }}>
    <img src={heroUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
    <div className="absolute inset-0" style={{
      background: `linear-gradient(135deg, hsl(var(--primary) / 0.55), hsl(var(--rose-light) / 0.45))`,
    }} />
    <div className="relative z-10">
      <h1 className="text-3xl font-bold mb-3"
        style={{ fontFamily: 'var(--font-display)', color: 'hsl(var(--primary-foreground))' }}>
        Beleza que Transforma
      </h1>
      <p className="text-sm mb-6 max-w-md mx-auto"
        style={{ fontFamily: 'var(--font-body)', color: 'hsl(var(--primary-foreground) / 0.85)' }}>
        Descubra nossa linha completa de cosméticos premium com ingredientes naturais.
      </p>
      <button className="px-6 py-2.5 text-sm font-semibold transition-colors"
        style={{
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-body)',
        }}>
        Ver Produtos
      </button>
    </div>
  </section>
);

const PRODUCT_IMAGES = [box06, box12, lipgloss];

const MockProductCard = ({ name, price, imageIndex }: { name: string; price: string; imageIndex: number }) => (
  <div className="flex flex-col overflow-hidden"
    style={{
      background: 'hsl(var(--card))',
      borderRadius: 'var(--radius)',
      border: '1px solid hsl(var(--border))',
    }}>
    <div className="aspect-square relative overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
      <img
        src={PRODUCT_IMAGES[imageIndex % PRODUCT_IMAGES.length]}
        alt={name}
        className="w-full h-full object-cover"
      />
      <div className="absolute top-2 right-2">
        <Heart className="w-4 h-4" style={{ color: 'hsl(var(--primary-foreground))' }} />
      </div>
      <div className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        style={{
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: 'var(--radius)',
        }}>
        Novo
      </div>
    </div>
    <div className="p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className="w-3 h-3 fill-current" style={{ color: 'hsl(var(--primary))' }} />
        ))}
        <span className="text-[10px] ml-1" style={{ color: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-body)' }}>(42)</span>
      </div>
      <h3 className="text-sm font-semibold leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'hsl(var(--card-foreground))' }}>
        {name}
      </h3>
      <p className="text-xs font-bold" style={{ color: 'hsl(var(--primary))', fontFamily: 'var(--font-body)' }}>
        {price}
      </p>
      <button className="mt-2 w-full py-1.5 text-xs font-semibold transition-colors"
        style={{
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-body)',
        }}>
        Adicionar
      </button>
    </div>
  </div>
);

const MockCTA = () => (
  <section className="w-full py-12 px-6 text-center"
    style={{ background: 'hsl(var(--charcoal))', color: 'hsl(var(--primary-foreground))' }}>
    <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
      Compre no Atacado
    </h2>
    <p className="text-xs mb-4 opacity-80" style={{ fontFamily: 'var(--font-body)' }}>
      Economize até 40% em pedidos a partir de 6 unidades
    </p>
    <button className="px-5 py-2 text-xs font-semibold"
      style={{
        background: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
        borderRadius: 'var(--radius)',
        fontFamily: 'var(--font-body)',
      }}>
      Ver Atacado
    </button>
  </section>
);

const MockFooter = () => (
  <footer className="w-full py-6 px-6"
    style={{ background: 'hsl(var(--charcoal))', color: 'hsl(var(--primary-foreground) / 0.6)' }}>
    <div className="flex justify-between items-center text-[10px]" style={{ fontFamily: 'var(--font-body)' }}>
      <span style={{ fontFamily: 'var(--font-display)', color: 'hsl(var(--primary-foreground))', fontSize: '14px', fontWeight: 'bold' }}>
        Minha Loja
      </span>
      <span>© 2026 Todos os direitos reservados</span>
    </div>
  </footer>
);

// ─── Main Component ───────────────────────────────────────

const ThemePreviewFrame = ({ draft }: ThemePreviewFrameProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState(1280);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(800);

  const theme = draft || DEFAULT_THEME;

  // Load fonts
  useEffect(() => {
    loadFont(theme.tokens.fonts.display);
    loadFont(theme.tokens.fonts.body);
  }, [theme.tokens.fonts.display, theme.tokens.fonts.body]);

  // Calculate scale based on available width
  const updateScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const available = wrapper.clientWidth - 32;
    const s = Math.min(1, available / viewport);
    setScale(s);
  }, [viewport]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  // Observe content height for proper scroll sizing
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scopedStyle = useMemo(() => buildScopedStyle(theme), [theme]);
  const showTopBar = theme.components.topBar.visible;

  // Spacer dimensions so overflow-auto works correctly with scaled content
  const spacerWidth = viewport * scale;
  const spacerHeight = contentHeight * scale;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
        {VIEWPORTS.map(v => (
          <Button
            key={v.width}
            variant={viewport === v.width ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewport(v.width)}
            className="gap-1.5"
          >
            <v.icon className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">{v.label}</span>
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {viewport}px · {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Preview area with proper scroll */}
      <div ref={wrapperRef} className="flex-1 overflow-auto bg-muted/20 flex justify-center p-4">
        {/* Spacer div with explicit dimensions so scroll works */}
        <div style={{ width: spacerWidth, height: spacerHeight, position: 'relative', flexShrink: 0 }}>
          <div
            ref={contentRef}
            style={{
              ...scopedStyle,
              width: viewport,
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            className="shadow-lg border border-border rounded-lg overflow-hidden"
          >
            {/* Storefront mockup */}
            <div style={{ background: 'hsl(var(--background))' }}>
              {showTopBar && <MockTopBar text={theme.components.topBar.text} />}
              <MockHeader logoUrl={getImageUrl(theme, 'logo', '')} />
              <MockHero heroUrl={getImageUrl(theme, 'heroBanner', heroBanner)} />
              <section className="px-6 py-8" style={{ background: 'hsl(var(--background))' }}>
                <h2 className="text-lg font-bold mb-4 text-center"
                  style={{ fontFamily: 'var(--font-display)', color: 'hsl(var(--foreground))' }}>
                  Produtos em Destaque
                </h2>
                <div className={`grid gap-4 ${viewport <= 375 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  <MockProductCard name="Batom Velvet Rose" price="R$ 89,90" imageIndex={0} />
                  <MockProductCard name="Sérum Vitamina C" price="R$ 129,90" imageIndex={1} />
                  {viewport > 375 && <MockProductCard name="Paleta de Sombras" price="R$ 159,90" imageIndex={2} />}
                </div>
              </section>
              <MockCTA />
              <MockFooter />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemePreviewFrame;
