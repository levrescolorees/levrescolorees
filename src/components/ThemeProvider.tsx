import { useEffect } from 'react';
import { useStoreSettings, ThemeSettings } from '@/hooks/useStoreSettings';

const GOOGLE_FONTS_MAP: Record<string, string> = {
  'Playfair Display': 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500',
  'Cormorant Garamond': 'Cormorant+Garamond:wght@400;500;600;700',
  'Lora': 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400',
  'Merriweather': 'Merriweather:wght@300;400;700',
  'Libre Baskerville': 'Libre+Baskerville:ital,wght@0,400;0,700;1,400',
  'Inter': 'Inter:wght@300;400;500;600;700',
  'Poppins': 'Poppins:wght@300;400;500;600;700',
  'Nunito': 'Nunito:wght@300;400;500;600;700',
  'Open Sans': 'Open+Sans:wght@300;400;500;600;700',
  'Lato': 'Lato:wght@300;400;700',
};

const CSS_VAR_MAP: Record<keyof import('@/hooks/useStoreSettings').ThemeColors, string> = {
  primary: '--primary',
  primary_light: '--rose-light',
  primary_glow: '--rose-glow',
  background: '--background',
  card: '--card',
  foreground: '--foreground',
  muted_foreground: '--muted-foreground',
  accent: '--accent',
  nude: '--nude',
  charcoal: '--charcoal',
  border: '--border',
  destructive: '--destructive',
};

// Also sync derived vars
const DERIVED_SYNC: Record<string, string[]> = {
  '--primary': ['--ring', '--rose'],
  '--background': ['--cream', '--primary-foreground'],
  '--card': ['--popover'],
  '--foreground': ['--card-foreground', '--popover-foreground'],
  '--border': ['--input'],
  '--nude': ['--secondary'],
};

function loadGoogleFont(family: string) {
  const spec = GOOGLE_FONTS_MAP[family];
  if (!spec) return;
  const id = `gf-${family.replace(/\s/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  document.head.appendChild(link);
}

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    const theme = settings?.theme as ThemeSettings | undefined;
    if (!theme) return;

    const root = document.documentElement;

    // Apply colors
    if (theme.colors) {
      for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
        const value = theme.colors[key as keyof typeof theme.colors];
        if (value) {
          root.style.setProperty(cssVar, value);
          // Sync derived vars
          const derived = DERIVED_SYNC[cssVar];
          if (derived) {
            derived.forEach(d => root.style.setProperty(d, value));
          }
        }
      }
    }

    // Apply fonts
    if (theme.fonts) {
      if (theme.fonts.display) {
        loadGoogleFont(theme.fonts.display);
        root.style.setProperty('--font-display', `'${theme.fonts.display}', serif`);
      }
      if (theme.fonts.body) {
        loadGoogleFont(theme.fonts.body);
        root.style.setProperty('--font-body', `'${theme.fonts.body}', sans-serif`);
      }
    }

    // Apply radius
    if (theme.radius) {
      root.style.setProperty('--radius', theme.radius);
    }
  }, [settings?.theme]);

  return <>{children}</>;
};

export default ThemeProvider;
