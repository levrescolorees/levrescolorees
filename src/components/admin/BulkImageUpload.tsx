import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface BulkImageUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FilePreview {
  file: File;
  preview: string;
  sku: string;
}

function extractSKU(filename: string): string {
  // Remove extension
  const name = filename.replace(/\.[^.]+$/, '');
  // Try patterns: SKU-001-frente, SKU-001_frente, SKU001-frente
  // Take everything before the last dash/underscore separator that looks like a suffix
  const parts = name.split(/[-_]/);
  if (parts.length >= 2) {
    // Rejoin all but the last part as SKU (e.g., SKU-001 from SKU-001-frente)
    // But if there are only 2 parts, first part is the SKU
    // Heuristic: try progressively shorter prefixes until we find a match
    return parts.slice(0, -1).join('-');
  }
  return name;
}

const BulkImageUpload = ({ open, onOpenChange }: BulkImageUploadProps) => {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const additions: FilePreview[] = Array.from(newFiles)
      .filter(f => f.type.startsWith('image/'))
      .map(file => ({
        file,
        preview: URL.createObjectURL(file),
        sku: extractSKU(file.name),
      }));
    setFiles(prev => [...prev, ...additions]);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleConfirm = async () => {
    if (!files.length) return;
    setUploading(true);

    // Group files by SKU
    const skuMap = new Map<string, File[]>();
    for (const f of files) {
      const existing = skuMap.get(f.sku) || [];
      existing.push(f.file);
      skuMap.set(f.sku, existing);
    }

    let matched = 0;
    let unmatched = 0;
    const unmatchedSkus: string[] = [];

    try {
      for (const [sku, skuFiles] of skuMap) {
        // Find product by SKU
        const { data: product } = await supabase
          .from('products')
          .select('id, images')
          .eq('sku', sku)
          .maybeSingle();

        if (!product) {
          unmatched += skuFiles.length;
          unmatchedSkus.push(sku);
          continue;
        }

        const newUrls: string[] = [];

        for (const file of skuFiles) {
          const ext = file.name.split('.').pop() || 'jpg';
          const path = `${product.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(path, file, { cacheControl: '3600', upsert: false });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          const { data: publicUrl } = supabase.storage
            .from('product-images')
            .getPublicUrl(path);

          newUrls.push(publicUrl.publicUrl);
        }

        if (newUrls.length) {
          const updatedImages = [...(product.images || []), ...newUrls];
          await supabase
            .from('products')
            .update({ images: updatedImages })
            .eq('id', product.id);
          matched += newUrls.length;
        }
      }

      qc.invalidateQueries({ queryKey: ['admin', 'products'] });

      if (matched > 0) toast.success(`${matched} imagem(ns) associada(s) com sucesso!`);
      if (unmatched > 0) toast.warning(`${unmatched} imagem(ns) sem produto correspondente (SKUs: ${unmatchedSkus.join(', ')})`);

      // Clean up
      files.forEach(f => URL.revokeObjectURL(f.preview));
      setFiles([]);
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro no upload: ' + (err.message || 'Tente novamente.'));
    } finally {
      setUploading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      files.forEach(f => URL.revokeObjectURL(f.preview));
      setFiles([]);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload de Imagens em Lote</DialogTitle>
          <DialogDescription>
            Nomeie os arquivos com o SKU do produto (ex: <strong>SKU-001-frente.jpg</strong>).
            O sistema associa automaticamente pelo SKU.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="font-body text-sm text-muted-foreground">
            Arraste imagens aqui ou clique para selecionar
          </p>
          <p className="font-body text-xs text-muted-foreground mt-1">
            Convenção: <code className="bg-muted px-1 rounded">SKU-001-frente.jpg</code>
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* Preview list */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <p className="font-body text-sm font-medium text-foreground">
              {files.length} arquivo(s) selecionado(s)
            </p>
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-muted/30 rounded-md">
                <img
                  src={f.preview}
                  alt={f.file.name}
                  className="w-10 h-10 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-xs text-foreground truncate">{f.file.name}</p>
                  <p className="font-body text-xs text-muted-foreground">
                    SKU detectado: <span className="font-semibold text-primary">{f.sku}</span>
                  </p>
                </div>
                <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={uploading || !files.length}>
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
            ) : (
              <><Image className="w-4 h-4 mr-2" /> Enviar {files.length} imagem(ns)</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImageUpload;
