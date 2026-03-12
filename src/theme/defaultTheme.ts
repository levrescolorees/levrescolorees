// ─── Theme Interfaces ──────────────────────────────────────

export interface ThemeColors {
  primary: string;
  primary_light: string;
  primary_glow: string;
  background: string;
  card: string;
  foreground: string;
  muted: string;
  muted_foreground: string;
  accent: string;
  accent_foreground: string;
  secondary: string;
  secondary_foreground: string;
  popover: string;
  popover_foreground: string;
  card_foreground: string;
  primary_foreground: string;
  destructive: string;
  destructive_foreground: string;
  border: string;
  input: string;
  ring: string;
  nude: string;
  charcoal: string;
}

export interface ThemeTokens {
  colors: ThemeColors;
  fonts: { display: string; body: string };
  radius: string;
}

export interface ThemeTopBar {
  visible: boolean;
  text: string;
}

export interface ThemeImages {
  logo: string;
  heroBanner: string;
}

export interface ThemeComponents {
  topBar: ThemeTopBar;
  images: ThemeImages;
}

export interface ThemeMeta {
  updatedAt: string;
  updatedById: string;
  preset: string; // 'custom' | 'elegant' | 'minimal' | 'premiumRose' | 'dark'
}

export interface ThemeHistoryEntry {
  savedAt: string;
  savedById: string;
  revision: number;
  theme: { tokens: ThemeTokens; components: ThemeComponents };
}

export interface ThemeSettings {
  version: number;
  revision: number;
  tokens: ThemeTokens;
  components: ThemeComponents;
  meta: ThemeMeta;
  history: ThemeHistoryEntry[];
}

// ─── Default Theme ─────────────────────────────────────────

export const DEFAULT_COLORS: ThemeColors = {
  primary: '340 78% 45%',
  primary_light: '340 65% 60%',
  primary_glow: '340 70% 75%',
  background: '20 60% 99%',
  card: '30 20% 99%',
  card_foreground: '0 0% 18%',
  foreground: '0 0% 18%',
  muted: '340 20% 96%',
  muted_foreground: '0 0% 40%',
  accent: '30 40% 50%',
  accent_foreground: '20 60% 99%',
  secondary: '340 15% 95%',
  secondary_foreground: '0 0% 18%',
  popover: '30 20% 99%',
  popover_foreground: '0 0% 18%',
  primary_foreground: '20 60% 99%',
  destructive: '0 84.2% 60.2%',
  destructive_foreground: '210 40% 98%',
  border: '20 15% 88%',
  input: '20 15% 88%',
  ring: '340 78% 45%',
  nude: '5 30% 88%',
  charcoal: '0 0% 18%',
};

export const DEFAULT_THEME: ThemeSettings = {
  version: 2,
  revision: 0,
  tokens: {
    colors: { ...DEFAULT_COLORS },
    fonts: { display: 'Playfair Display', body: 'Inter' },
    radius: '0.5rem',
  },
  components: {
    topBar: { visible: true, text: 'FRETE GRÁTIS acima de R$299 • Compre no Atacado e economize até 40%' },
    images: { logo: '', heroBanner: '' },
  },
  meta: {
    updatedAt: '',
    updatedById: '',
    preset: 'custom',
  },
  history: [],
};

// ─── Presets ───────────────────────────────────────────────

function makePreset(
  name: string,
  colors: Partial<ThemeColors>,
  fonts?: Partial<ThemeTokens['fonts']>,
  radius?: string,
): ThemeSettings {
  return {
    ...DEFAULT_THEME,
    tokens: {
      colors: { ...DEFAULT_COLORS, ...colors },
      fonts: { ...DEFAULT_THEME.tokens.fonts, ...fonts },
      radius: radius || DEFAULT_THEME.tokens.radius,
    },
    meta: { ...DEFAULT_THEME.meta, preset: name },
  };
}

export const PRESETS: Record<string, ThemeSettings> = {
  elegant: makePreset('elegant', {
    primary: '38 60% 45%',
    primary_light: '38 50% 60%',
    primary_glow: '38 55% 72%',
    background: '40 20% 96%',
    card: '40 15% 99%',
    foreground: '30 10% 12%',
    muted_foreground: '30 8% 45%',
    accent: '38 60% 55%',
    accent_foreground: '40 20% 96%',
    ring: '38 60% 45%',
    border: '35 12% 85%',
    nude: '35 25% 88%',
    charcoal: '30 5% 18%',
  }, { display: 'Cormorant Garamond', body: 'Lato' }, '0.375rem'),

  minimal: makePreset('minimal', {
    primary: '0 0% 10%',
    primary_light: '0 0% 30%',
    primary_glow: '0 0% 50%',
    background: '0 0% 100%',
    card: '0 0% 99%',
    card_foreground: '0 0% 8%',
    foreground: '0 0% 8%',
    muted_foreground: '0 0% 45%',
    accent: '0 0% 20%',
    accent_foreground: '0 0% 98%',
    ring: '0 0% 10%',
    border: '0 0% 90%',
    nude: '0 0% 95%',
    secondary: '0 0% 95%',
    charcoal: '0 0% 8%',
    destructive: '0 72% 51%',
  }, { display: 'Libre Baskerville', body: 'Inter' }, '0rem'),

  premiumRose: makePreset('premiumRose', {
    primary: '340 82% 52%',
    primary_light: '340 70% 65%',
    primary_glow: '340 75% 78%',
    background: '340 15% 97%',
    card: '340 10% 99%',
    foreground: '340 10% 10%',
    muted_foreground: '340 8% 42%',
    accent: '20 60% 55%',
    accent_foreground: '340 15% 97%',
    ring: '340 82% 52%',
    border: '340 10% 88%',
    nude: '340 20% 92%',
    charcoal: '340 8% 15%',
  }, { display: 'Playfair Display', body: 'Poppins' }),

  dark: makePreset('dark', {
    primary: '328 90% 55%',
    primary_light: '328 80% 65%',
    primary_glow: '328 85% 75%',
    primary_foreground: '0 0% 98%',
    background: '0 0% 6%',
    card: '0 0% 10%',
    card_foreground: '0 0% 92%',
    foreground: '0 0% 92%',
    popover: '0 0% 10%',
    popover_foreground: '0 0% 92%',
    muted: '0 0% 15%',
    muted_foreground: '0 0% 60%',
    accent: '38 50% 55%',
    accent_foreground: '0 0% 98%',
    secondary: '0 0% 15%',
    secondary_foreground: '0 0% 92%',
    ring: '328 90% 55%',
    border: '0 0% 18%',
    input: '0 0% 18%',
    nude: '0 0% 15%',
    charcoal: '0 0% 5%',
    destructive: '0 62% 30%',
    destructive_foreground: '0 0% 98%',
  }, { display: 'Playfair Display', body: 'Inter' }),
};

export const PRESET_LIST = Object.entries(PRESETS).map(([key, preset]) => ({
  key,
  label: key === 'elegant' ? 'Elegante' : key === 'minimal' ? 'Minimalista' : key === 'premiumRose' ? 'Rosé Premium' : 'Modo Escuro',
  preset,
}));
