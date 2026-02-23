import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ThemeSettings } from '@/theme/defaultTheme';
import { DEFAULT_THEME, type ThemeColors } from '@/theme/defaultTheme';
import { getFontFamily, loadFont } from '@/theme/fontMap';

// Real storefront components
import Header from '@/components/Header';
import HeroBanner from '@/components/HeroBanner';
import BenefitsSection from '@/components/BenefitsSection';
import FeaturedProducts from '@/components/FeaturedProducts';
import SmartPricingSection from '@/components/SmartPricingSection';
import CollectionsSection from '@/components/CollectionsSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import FinalCTA from '@/components/FinalCTA';
import Footer from '@/components/Footer';

// Full pages for preview navigation
import Collections from '@/pages/Collections';
import Atacado from '@/pages/Atacado';

const VIEWPORTS = [
  { label: 'Desktop', width: 1280, icon: Monitor },
  { label: 'Tablet', width: 768, icon: Tablet },
  { label: 'Mobile', width: 375, icon: Smartphone },
] as const;

interface ThemePreviewFrameProps {
  draft: ThemeSettings | null;
}

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

type PreviewPage = 'home' | 'collections' | 'atacado';

const ThemePreviewFrame = ({ draft }: ThemePreviewFrameProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState(1280);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(800);
  const [previewPage, setPreviewPage] = useState<PreviewPage>('home');

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

      {/* Preview area */}
      <div ref={wrapperRef} className="flex-1 overflow-auto bg-muted/20 flex justify-center p-4">
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
            {/* Real storefront rendered with draft CSS vars, interactions disabled */}
            <div
              onClickCapture={(e) => {
                const target = e.target as HTMLElement;
                const anchor = target.closest('a');
                if (anchor) {
                  e.preventDefault();
                  e.stopPropagation();
                  // Use pathname + getAttribute for reliability with react-router links
                  const pathname = anchor.pathname || '';
                  const href = anchor.getAttribute('href') || '';
                  const check = pathname + ' ' + href;
                  if (check.includes('/colecoes')) setPreviewPage('collections');
                  else if (check.includes('/atacado')) setPreviewPage('atacado');
                  else if (pathname === '/' || href === '/') setPreviewPage('home');
                }
              }}
              onSubmitCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              {previewPage === 'home' && (
                <>
                  <Header />
                  <HeroBanner />
                  <BenefitsSection />
                  <FeaturedProducts />
                  <SmartPricingSection />
                  <CollectionsSection />
                  <TestimonialsSection />
                  <FinalCTA />
                  <Footer />
                </>
              )}
              {previewPage === 'collections' && <Collections />}
              {previewPage === 'atacado' && <Atacado />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemePreviewFrame;
