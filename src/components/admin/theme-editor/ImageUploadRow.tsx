import { useState, useRef } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploadRowProps {
  label: string;
  description: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
}

const SUPABASE_URL = "https://jefuidilwgzsnifjgdaf.supabase.co";

export default function ImageUploadRow({ label, description, value, onChange, folder }: ImageUploadRowProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const publicUrl = (path: string) =>
    `${SUPABASE_URL}/storage/v1/object/public/theme-assets/${path}`;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${folder}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('theme-assets')
        .upload(path, file, { upsert: true });

      if (error) throw error;

      onChange(publicUrl(path));
      toast.success(`${label} atualizado!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao fazer upload.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange('');
    toast.info(`${label} removido.`);
  };

  return (
    <div className="space-y-2">
      <div>
        <span className="font-body text-sm font-medium text-foreground">{label}</span>
        <p className="font-body text-xs text-muted-foreground">{description}</p>
      </div>

      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-border" style={{ maxWidth: 280 }}>
          <img src={value} alt={label} className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload className="w-3.5 h-3.5 mr-1" /> Trocar
            </Button>
            <Button size="sm" variant="destructive" onClick={handleRemove}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-3 w-full max-w-[280px] p-4 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors text-left"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          ) : (
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          )}
          <span className="font-body text-sm text-muted-foreground">
            {uploading ? 'Enviando...' : 'Clique para enviar imagem'}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}
