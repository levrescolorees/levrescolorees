import { z } from 'zod';
import { DEFAULT_THEME, type ThemeSettings } from './defaultTheme';

// ─── Normalize HSL ─────────────────────────────────────────
export function normalizeHsl(input: string): string {
  // Accept "hsl(328, 100%, 45%)" or "328 100% 45%"
  const cleaned = input
    .replace(/hsl\s*\(/i, '')
    .replace(/\)/g, '')
    .replace(/,/g, ' ')
    .replace(/%/g, '')
    .trim();
  const parts = cleaned.split(/\s+/).map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return input;
  return `${Math.round(parts[0])} ${Math.round(parts[1])}% ${Math.round(parts[2])}%`;
}

// ─── Zod Schema ────────────────────────────────────────────
const hslColor = z.string().refine(
  (v) => {
    const parts = v.replace(/%/g, '').split(/\s+/).map(Number);
    return parts.length >= 3 && parts.every((n) => !isNaN(n));
  },
  { message: 'Must be HSL format: "H S% L%"' }
);

const ALLOWED_DISPLAY_FONTS = ['Playfair Display', 'Cormorant Garamond', 'Lora', 'Merriweather', 'Libre Baskerville'];
const ALLOWED_BODY_FONTS = ['Inter', 'Poppins', 'Nunito', 'Open Sans', 'Lato'];

const colorsSchema = z.object({
  primary: hslColor,
  primary_light: hslColor,
  primary_glow: hslColor,
  background: hslColor,
  card: hslColor,
  card_foreground: hslColor,
  foreground: hslColor,
  muted: hslColor,
  muted_foreground: hslColor,
  accent: hslColor,
  accent_foreground: hslColor,
  secondary: hslColor,
  secondary_foreground: hslColor,
  popover: hslColor,
  popover_foreground: hslColor,
  primary_foreground: hslColor,
  destructive: hslColor,
  destructive_foreground: hslColor,
  border: hslColor,
  input: hslColor,
  ring: hslColor,
  nude: hslColor,
  charcoal: hslColor,
});

export const themeSettingsSchema = z.object({
  version: z.number(),
  revision: z.number(),
  tokens: z.object({
    colors: colorsSchema,
    fonts: z.object({
      display: z.string().refine((v) => ALLOWED_DISPLAY_FONTS.includes(v), { message: 'Font not allowed' }),
      body: z.string().refine((v) => ALLOWED_BODY_FONTS.includes(v), { message: 'Font not allowed' }),
    }),
    radius: z.string(),
  }),
  components: z.object({
    topBar: z.object({
      visible: z.boolean(),
      text: z.string(),
    }),
  }),
  meta: z.object({
    updatedAt: z.string(),
    updatedById: z.string(),
    preset: z.string(),
  }),
  history: z.array(z.any()).optional(),
});

// ─── Deep Merge ────────────────────────────────────────────
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sv = source[key];
    const tv = target[key];
    if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv)) {
      (result as any)[key] = deepMerge(tv as Record<string, any>, sv as Record<string, any>);
    } else if (sv !== undefined) {
      (result as any)[key] = sv;
    }
  }
  return result;
}

// ─── Migrate from any version ──────────────────────────────
export function migrateTheme(raw: any): ThemeSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_THEME };

  // v1 format (flat colors/fonts/radius/topBar)
  if (!raw.tokens && raw.colors) {
    const migrated: ThemeSettings = deepMerge(DEFAULT_THEME, {
      tokens: {
        colors: { ...DEFAULT_THEME.tokens.colors, ...raw.colors },
        fonts: { ...DEFAULT_THEME.tokens.fonts, ...raw.fonts },
        radius: raw.radius || DEFAULT_THEME.tokens.radius,
      },
      components: {
        topBar: { ...DEFAULT_THEME.components.topBar, ...raw.topBar },
      },
    });
    return migrated;
  }

  // v2 format
  return deepMerge(DEFAULT_THEME, raw as Partial<ThemeSettings>);
}
