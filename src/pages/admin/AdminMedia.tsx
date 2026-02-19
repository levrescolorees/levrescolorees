import { useState, useCallback } from 'react';
import { Upload, Trash2, Copy, Search, Image as ImageIcon, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface MediaFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any> | null;
}

const BUCKET = 'product-images';

function useMediaFiles() {
  return useQuery({
    queryKey: ['admin', 'media'],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).list('', {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) throw error;
      return (data ?? []).filter(f => f.name !== '.emptyFolderPlaceholder') as MediaFile[];
    },
  });
}

const AdminMedia = () => {
  const qc = useQueryClient();
  const { data: files, isLoading } = useMediaFiles();
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getPublicUrl = (name: string) =>
    supabase.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(uploadFiles)) {
        const ext = file.name.split('.').pop();
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(name, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ['admin', 'media'] });
      toast.success(`${uploadFiles.length} arquivo(s) enviado(s)!`);
    } catch {
      toast.error('Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [qc]);

  const deleteFile = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.storage.from(BUCKET).remove([name]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'media'] });
      toast.success('Arquivo excluído.');
    },
    onError: () => toast.error('Erro ao excluir.'),
  });

  const copyUrl = (name: string) => {
    const url = getPublicUrl(name);
    navigator.clipboard.writeText(url);
    setCopiedId(name);
    toast.success('URL copiada!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = files?.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Mídia</h1>
        <label className="cursor-pointer">
          <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button asChild disabled={uploading}>
            <span><Upload className="w-4 h-4 mr-2" /> {uploading ? 'Enviando...' : 'Upload'}</span>
          </Button>
        </label>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar arquivo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 font-body" />
      </div>

      {isLoading ? (
        <div className="text-center py-20 font-body text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-body text-sm text-muted-foreground">Nenhuma imagem encontrada. Faça upload acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(f => (
            <div key={f.name} className="group bg-card rounded-lg shadow-soft overflow-hidden">
              <div className="aspect-square bg-muted relative">
                <img
                  src={getPublicUrl(f.name)}
                  alt={f.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => copyUrl(f.name)}>
                    {copiedId === f.name ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="destructive" className="h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir imagem?</AlertDialogTitle>
                        <AlertDialogDescription>"{f.name}" será removida permanentemente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteFile.mutate(f.name)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="p-2">
                <p className="font-body text-xs text-foreground truncate">{f.name}</p>
                <p className="font-body text-[10px] text-muted-foreground">
                  {f.metadata?.size ? formatSize(f.metadata.size) : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminMedia;
