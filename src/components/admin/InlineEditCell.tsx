import { useEffect, useRef, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';

interface InlineEditCellProps {
  value: number;
  display: string;
  type: 'currency' | 'integer';
  saving?: boolean;
  onSave: (newValue: number) => void;
}

const InlineEditCell = ({ value, display, type, saving, onSave }: InlineEditCellProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const committed = useRef(false);

  useEffect(() => {
    if (editing) {
      setDraft(type === 'currency' ? value.toFixed(2) : String(value));
      setError(null);
      committed.current = false;
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, value, type]);

  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    const parsed = Number(draft.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Valor inválido');
      committed.current = false;
      return;
    }
    const normalized = type === 'integer' ? Math.round(parsed) : Math.round(parsed * 100) / 100;
    setEditing(false);
    if (normalized !== value) onSave(normalized);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="number"
          step={type === 'currency' ? '0.01' : '1'}
          min="0"
          value={draft}
          onChange={e => { setDraft(e.target.value); setError(null); }}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { committed.current = true; setEditing(false); }
          }}
          className="w-24 px-2 py-1 rounded border border-primary bg-background font-body text-sm text-foreground outline-none"
        />
        {error && <span className="text-[10px] font-body text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Clique para editar"
      className="group inline-flex items-center gap-1.5 rounded px-1.5 py-1 -mx-1.5 font-body text-sm text-foreground hover:bg-muted transition-colors"
    >
      <span>{display}</span>
      {saving ? (
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      ) : (
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
};

export default InlineEditCell;
