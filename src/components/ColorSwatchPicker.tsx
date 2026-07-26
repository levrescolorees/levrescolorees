import { useMemo, useState } from 'react';
import type { DBVariant } from '@/hooks/useProducts';

interface Props {
  variants: DBVariant[];
  selected: string;
  onSelect: (name: string) => void;
}

const FAMILY_ORDER = ['Fair', 'Light', 'Medium', 'Tan', 'Deep'] as const;
type Family = typeof FAMILY_ORDER[number];

const FAMILY_SAMPLE: Record<Family, string> = {
  Fair: '#F5D9C4',
  Light: '#E8B896',
  Medium: '#C8935F',
  Tan: '#9B6A3E',
  Deep: '#5C3A24',
};

// Extract family (first word) and code (rest) from variant name like "Medium M10"
const parseName = (name: string): { family: Family | null; code: string } => {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] as Family;
  if (FAMILY_ORDER.includes(first)) {
    return { family: first, code: parts.slice(1).join(' ') || name };
  }
  return { family: null, code: name };
};

const ColorSwatchPicker = ({ variants, selected, onSelect }: Props) => {
  const parsed = useMemo(
    () => variants.map(v => ({ ...v, ...parseName(v.name) })),
    [variants]
  );

  const hasFamilies = parsed.some(v => v.family !== null);

  // Available families present in this product
  const availableFamilies = useMemo(
    () => FAMILY_ORDER.filter(f => parsed.some(v => v.family === f)),
    [parsed]
  );

  const [filter, setFilter] = useState<Family | 'all'>('all');

  const selectedInfo = parsed.find(v => v.name === selected);
  const displayCode = selectedInfo?.code || selected;

  // Fallback to text pills if names don't follow family pattern
  if (!hasFamilies) {
    return (
      <div>
        <h3 className="font-body text-sm font-semibold text-foreground mb-3">Cor: {selected}</h3>
        <div className="flex flex-wrap gap-2">
          {variants.map(v => (
            <button
              key={v.id}
              onClick={() => onSelect(v.name)}
              disabled={v.stock <= 0}
              className={`px-3 py-1.5 rounded-sm text-sm font-body transition-colors ${
                v.name === selected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground hover:bg-muted'
              } ${v.stock <= 0 ? 'opacity-50 cursor-not-allowed line-through' : ''}`}
            >
              {v.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const visible = filter === 'all' ? parsed : parsed.filter(v => v.family === filter);

  return (
    <div>
      <h3 className="font-body text-sm font-semibold text-foreground mb-3">Seleção de cores</h3>

      {/* Family filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {availableFamilies.map(f => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border transition-all text-sm font-body ${
                active
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border hover:border-primary/50 text-muted-foreground'
              }`}
            >
              <span
                className="w-5 h-5 rounded-full border border-black/10"
                style={{ backgroundColor: FAMILY_SAMPLE[f] }}
              />
              {f}
            </button>
          );
        })}
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full border transition-all text-sm font-body ${
            filter === 'all'
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-border hover:border-primary/50 text-muted-foreground'
          }`}
        >
          Todas as cores
        </button>
      </div>

      {/* Selected label */}
      <p className="font-body text-sm text-foreground mb-3">
        Cor Selecionada: <span className="font-semibold">{displayCode}</span>
      </p>

      {/* Swatch grid */}
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-9 gap-2.5">
        {visible.map(v => {
          const active = v.name === selected;
          const outOfStock = v.stock <= 0;
          const img = v.images?.[0];
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v.name)}
              disabled={outOfStock}
              title={`${v.name}${outOfStock ? ' (esgotado)' : ''}`}
              aria-label={v.name}
              className={`relative aspect-square rounded-full overflow-hidden border border-black/10 bg-secondary transition-transform ${
                active ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' : 'hover:scale-110'
              } ${outOfStock ? 'opacity-60 cursor-not-allowed' : ''}`}
              style={img ? { backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {outOfStock && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="block w-full h-[1.5px] bg-foreground/70 rotate-45" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ColorSwatchPicker;
