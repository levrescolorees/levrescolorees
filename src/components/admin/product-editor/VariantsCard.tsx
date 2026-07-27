import { Plus, Trash2, ChevronDown, ChevronUp, Upload, X, Star, ImageIcon, Link as LinkIcon } from 'lucide-react';
import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export interface VariantRow {
  id?: string;
  name: string;
  sku: string;
  stock: string;
  price_override: string;
  images: string[];
}

interface VariantsCardProps {
  variants: VariantRow[];
  productId: string | null;
  onChange: (variants: VariantRow[]) => void;
}

const VariantImages = ({
  images,
  onChange,
  productId,
  variantIdx,
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
  productId: string | null;
  variantIdx: number;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true);
    const basePath = `${productId || `temp/${Date.now()}`}/variants/${variantIdx}`;
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `${basePath}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
      if (error) {
        toast.error(`Erro ao enviar ${file.name}: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      newUrls.push(data.publicUrl);
    }
    if (newUrls.length > 0) {
      onChange([...images, ...newUrls]);
      toast.success(`${newUrls.length} imagem(ns) adicionada(s)`);
    }
    setUploading(false);
  };

  const addFromUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      toast.error('URL inválida — precisa começar com http(s)://');
      return;
    }
    onChange([...images, trimmed]);
    setUrlInput('');
  };

  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const arr = [...images];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onChange(arr);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-body text-xs">Imagens da variante ({images.length})</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="font-body text-xs"
        >
          <Upload className="w-3 h-3 mr-1" />
          {uploading ? 'Enviando...' : 'Enviar imagens'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {images.map((url, idx) => (
            <div
              key={url + idx}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={e => {
                e.preventDefault();
                if (dragIdx !== null && dragIdx !== idx) {
                  move(dragIdx, idx);
                  setDragIdx(idx);
                }
              }}
              onDragEnd={() => setDragIdx(null)}
              className={`relative group aspect-square rounded-md overflow-hidden border-2 cursor-grab active:cursor-grabbing ${
                idx === 0 ? 'border-primary ring-1 ring-primary/20' : 'border-border'
              }`}
            >
              <img src={url} alt={`Variante ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
              {idx === 0 && (
                <div className="absolute top-0.5 left-0.5 bg-primary text-primary-foreground text-[8px] font-body font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                  <Star className="w-2 h-2" />
                </div>
              )}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover imagem?</AlertDialogTitle>
                    <AlertDialogDescription>Esta imagem da variante será removida.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(idx)}>Remover</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs font-body text-muted-foreground py-2 border border-dashed border-border rounded-md px-3">
          <ImageIcon className="w-4 h-4" /> Nenhuma imagem — envie ou cole uma URL abaixo
        </div>
      )}

      <div className="flex items-center gap-2">
        <LinkIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <Input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addFromUrl();
            }
          }}
          placeholder="Colar URL de imagem existente"
          className="font-body text-xs h-8"
        />
        <Button type="button" variant="outline" size="sm" onClick={addFromUrl} className="font-body text-xs h-8">
          Adicionar
        </Button>
      </div>
    </div>
  );
};

const VariantsCard = ({ variants, productId, onChange }: VariantsCardProps) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const updateVariant = (idx: number, field: keyof VariantRow, value: string | string[]) => {
    const arr = [...variants];
    (arr[idx] as any)[field] = value;
    onChange(arr);
  };

  const addVariant = () => {
    onChange([...variants, { name: '', sku: '', stock: '0', price_override: '', images: [] }]);
    setExpandedIdx(variants.length);
  };

  const removeVariant = (idx: number) => {
    onChange(variants.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-body font-semibold">Variantes ({variants.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={addVariant} className="font-body text-xs">
            <Plus className="w-3 h-3 mr-1" /> Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {variants.length === 0 && (
          <p className="text-xs font-body text-muted-foreground py-2">Nenhuma variante. Adicione cores, modelos, etc.</p>
        )}
        {variants.map((v, i) => (
          <div key={i} className="border border-border rounded-lg">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors gap-3"
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Mini thumbnail strip */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {v.images.length > 0 ? (
                    <>
                      {v.images.slice(0, 3).map((url, ii) => (
                        <img
                          key={url + ii}
                          src={url}
                          alt=""
                          loading="lazy"
                          className="w-8 h-8 rounded object-cover border border-border bg-muted"
                        />
                      ))}
                      {v.images.length > 3 && (
                        <span className="text-[10px] font-body text-muted-foreground ml-1">+{v.images.length - 3}</span>
                      )}
                    </>
                  ) : (
                    <div className="w-8 h-8 rounded border border-dashed border-border bg-muted/40 flex items-center justify-center">
                      <ImageIcon className="w-3 h-3 text-muted-foreground/60" />
                    </div>
                  )}
                </div>
                <span className="font-body text-sm font-medium text-foreground truncate">{v.name || `Variante ${i + 1}`}</span>
                {v.sku && <span className="text-xs font-body text-muted-foreground hidden md:inline">SKU: {v.sku}</span>}
                <span className="text-xs font-body text-muted-foreground hidden md:inline">Est: {v.stock}</span>
                {v.price_override && <span className="text-xs font-body text-primary hidden md:inline">R$ {v.price_override}</span>}
              </div>
              {expandedIdx === i ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            </div>
            {expandedIdx === i && (
              <div className="px-4 pb-4 pt-2 border-t border-border space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="font-body text-xs">Nome</Label>
                    <Input value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} placeholder="Ex: Rosa Nude" className="font-body" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-body text-xs">SKU</Label>
                    <Input value={v.sku} onChange={e => updateVariant(i, 'sku', e.target.value)} className="font-body" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-body text-xs">Estoque</Label>
                    <Input type="number" value={v.stock} onChange={e => updateVariant(i, 'stock', e.target.value)} className="font-body" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-body text-xs">Preço Override (R$)</Label>
                    <Input type="number" step="0.01" value={v.price_override} onChange={e => updateVariant(i, 'price_override', e.target.value)} placeholder="Opcional" className="font-body" />
                  </div>
                </div>

                <VariantImages
                  images={v.images}
                  onChange={imgs => updateVariant(i, 'images', imgs)}
                  productId={productId}
                  variantIdx={i}
                />

                <div className="flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive font-body text-xs">
                        <Trash2 className="w-3 h-3 mr-1" /> Remover variante
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover variante?</AlertDialogTitle>
                        <AlertDialogDescription>A variante "{v.name || `Variante ${i + 1}`}" será removida.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeVariant(i)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default VariantsCard;
