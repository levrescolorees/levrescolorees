interface FontSpec {
  family: string;
  category: 'serif' | 'sans-serif';
  googleSpec: string;
}

const FONT_REGISTRY: Record<string, FontSpec> = {
  'Playfair Display': { family: 'Playfair Display', category: 'serif', googleSpec: 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500' },
  'Cormorant Garamond': { family: 'Cormorant Garamond', category: 'serif', googleSpec: 'Cormorant+Garamond:wght@400;500;600;700' },
  'Lora': { family: 'Lora', category: 'serif', googleSpec: 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  'Merriweather': { family: 'Merriweather', category: 'serif', googleSpec: 'Merriweather:wght@300;400;700' },
  'Libre Baskerville': { family: 'Libre Baskerville', category: 'serif', googleSpec: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400' },
  'Inter': { family: 'Inter', category: 'sans-serif', googleSpec: 'Inter:wght@300;400;500;600;700' },
  'Poppins': { family: 'Poppins', category: 'sans-serif', googleSpec: 'Poppins:wght@300;400;500;600;700' },
  'Nunito': { family: 'Nunito', category: 'sans-serif', googleSpec: 'Nunito:wght@300;400;500;600;700' },
  'Open Sans': { family: 'Open Sans', category: 'sans-serif', googleSpec: 'Open+Sans:wght@300;400;500;600;700' },
  'Lato': { family: 'Lato', category: 'sans-serif', googleSpec: 'Lato:wght@300;400;700' },
};

export const DISPLAY_FONTS = ['Playfair Display', 'Cormorant Garamond', 'Lora', 'Merriweather', 'Libre Baskerville'];
export const BODY_FONTS = ['Inter', 'Poppins', 'Nunito', 'Open Sans', 'Lato'];

export function loadFont(family: string): void {
  const spec = FONT_REGISTRY[family];
  if (!spec) return;
  const id = `gf-${family.replace(/\s/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${spec.googleSpec}&display=swap`;
  document.head.appendChild(link);
}

export function getFontFamily(family: string): string {
  const spec = FONT_REGISTRY[family];
  if (!spec) return `'${family}', sans-serif`;
  return `'${spec.family}', ${spec.category}`;
}
