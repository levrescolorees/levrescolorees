import { useRef, useState, useCallback } from 'react';
import { Upload, X, GripVertical, ImageIcon, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface MediaCardProps {
  images: string[];
  productId: string | null;
  onChange: (images: string[]) => void;
  errors: Record<string, string>;
}

const MediaCard = ({ images, productId, onChange, errors }: MediaCardProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    const newUrls: string[] = [];
    const basePath = productId || `temp/${Date.now()}`;

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `${basePath}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
      if (error) {
        toast.error(`Erro ao enviar ${file.name}: ${error.message}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    if (newUrls.length > 0) {
      onChange([...images, ...newUrls]);
      toast.success(`${newUrls.length} imagem(ns) enviada(s)`);
    }
    setUploading(false);
  }, [images, onChange, productId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [uploadFiles]);

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const arr = [...images];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onChange(arr);
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOverItem = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      moveImage(dragIdx, idx);
      setDragIdx(idx);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-body font-semibold">Mídia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          } ${errors.images ? 'border-destructive' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files && uploadFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-body text-muted-foreground">Enviando...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-body text-muted-foreground">
                Arraste imagens ou <span className="text-primary font-medium">clique para selecionar</span>
              </p>
              <p className="text-xs font-body text-muted-foreground">PNG, JPG, WebP</p>
            </div>
          )}
        </div>
        {errors.images && <p className="text-xs text-destructive font-body">{errors.images}</p>}

        {/* Image grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {images.map((url, idx) => (
              <div
                key={url}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOverItem(e, idx)}
                onDragEnd={() => setDragIdx(null)}
                className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                  idx === 0 ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                }`}
              >
                <img src={url} alt={`Imagem ${idx + 1}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] font-body font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5" /> Principal
                  </div>
                )}
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors" />
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90">
                        <X className="w-3 h-3" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover imagem?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeImage(idx)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4 text-primary-foreground drop-shadow" />
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length === 0 && !uploading && (
          <div className="flex items-center gap-2 text-xs font-body text-muted-foreground py-2">
            <ImageIcon className="w-4 h-4" /> Nenhuma imagem adicionada
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MediaCard;
