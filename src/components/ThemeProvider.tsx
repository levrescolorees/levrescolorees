import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { DEFAULT_THEME, type ThemeSettings, type ThemeColors } from '@/theme/defaultTheme';
import { migrateTheme } from '@/theme/themeSchema';
import { loadFont, getFontFamily } from '@/theme/fontMap';

// ─── CSS var mapping ───────────────────────────────────────
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

// Build CSS text from theme
function buildCssText(theme: ThemeSettings): string {
  const { colors, fonts, radius } = theme.tokens;
  let css = ':root {\n';
  for (const [key, cssVar] of Object.entries(COLOR_TO_CSS)) {
    const value = colors[key as keyof ThemeColors];
    if (value) css += `  ${cssVar}: ${value};\n`;
  }
  // Derived vars
  css += `  --rose: ${colors.primary};\n`;
  css += `  --cream: ${colors.background};\n`;
  css += `  --font-display: ${getFontFamily(fonts.display)};\n`;
  css += `  --font-body: ${getFontFamily(fonts.body)};\n`;
  css += `  --radius: ${radius};\n`;
  css += '}\n';
  return css;
}

// ─── Context ───────────────────────────────────────────────
interface ThemeContextValue {
  theme: ThemeSettings;
  applyTheme: (t: ThemeSettings) => void;
  resetToSaved: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  applyTheme: () => {},
  resetToSaved: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// ─── Provider ──────────────────────────────────────────────
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: settings } = useStoreSettings();
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [previewTheme, setPreviewTheme] = useState<ThemeSettings | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const channelIdRef = useRef<string | null>(null);
  const isPreviewMode = typeof window !== 'undefined' && window.location.search.includes('theme_preview=1');

  // Get or create style element
  const getStyleEl = useCallback(() => {
    if (styleRef.current) return styleRef.current;
    let el = document.getElementById('lovable-theme-vars') as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = 'lovable-theme-vars';
      document.head.appendChild(el);
    }
    styleRef.current = el;
    return el;
  }, []);

  // Apply theme to DOM
  const applyTheme = useCallback((t: ThemeSettings) => {
    const el = getStyleEl();
    el.textContent = buildCssText(t);
    // Load fonts
    loadFont(t.tokens.fonts.display);
    loadFont(t.tokens.fonts.body);
  }, [getStyleEl]);

  // Migrate saved theme from DB
  useEffect(() => {
    const raw = settings?.theme;
    if (!raw) return;
    try {
      const migrated = migrateTheme(raw);
      setTheme(migrated);
    } catch (err) {
      console.error('[ThemeProvider] migrateTheme failed, using default:', err);
      setTheme(DEFAULT_THEME);
    }
  }, [settings?.theme]);

  // Apply active theme
  useEffect(() => {
    applyTheme(previewTheme || theme);
  }, [theme, previewTheme, applyTheme]);

  // Preview mode: listen for postMessage
  useEffect(() => {
    if (!isPreviewMode) return;

    const handleMessage = (e: MessageEvent) => {
      const { type, channelId, theme: msgTheme } = e.data || {};
      // Always respond to INIT (even if already paired) to support retries
      if (type === 'THEME_PREVIEW_INIT' && channelId) {
        channelIdRef.current = channelId;
        if (import.meta.env.DEV) console.log('[ThemeProvider] responding READY', channelId);
        window.parent.postMessage({ type: 'THEME_PREVIEW_READY', channelId }, '*');
      }
      if (type === 'APPLY_THEME_DRAFT' && channelId === channelIdRef.current && msgTheme) {
        if (import.meta.env.DEV) console.log('[ThemeProvider] received APPLY_THEME_DRAFT', { logo: msgTheme?.components?.images?.logo || 'none' });
        const migrated = migrateTheme(msgTheme);
        setPreviewTheme(migrated);
      }
      if (type === 'RESET_THEME_TO_SAVED' && channelId === channelIdRef.current) {
        setPreviewTheme(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isPreviewMode]);

  const resetToSaved = useCallback(() => {
    setPreviewTheme(null);
  }, []);

  const contextApply = useCallback((t: ThemeSettings) => {
    setPreviewTheme(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: previewTheme || theme, applyTheme: contextApply, resetToSaved }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
