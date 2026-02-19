import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight, Upload, X, ImageIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { DBCollection } from '@/hooks/useProducts';

function useAdminCollections() {
  return useQuery({
    queryKey: ['admin', 'collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as DBCollection[];
    },
  });
}

interface CollectionForm {
  name: string;
  slug: string;
  description: string;
  collection_type: string;
  image: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm: CollectionForm = {
  name: '', slug: '', description: '', collection_type: 'manual',
  image: '', is_active: true, sort_order: 0,
};

const AdminCollections = () => {
  const qc = useQueryClient();
  const { data: collections, isLoading } = useAdminCollections();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<CollectionForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `collections/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(path);
      setForm(f => ({ ...f, image: urlData.publicUrl }));
      toast.success('Imagem enviada!');
    } catch {
      toast.error('Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setForm(f => ({ ...f, image: '' }));
  };

  const upsert = useMutation({
    mutationFn: async (data: CollectionForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from('collections').update({
          name: data.name, slug: data.slug, description: data.description,
          collection_type: data.collection_type, image: data.image || null,
          is_active: data.is_active, sort_order: data.sort_order,
        }).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('collections').insert({
          name: data.name, slug: data.slug, description: data.description,
          collection_type: data.collection_type, image: data.image || null,
          is_active: data.is_active, sort_order: data.sort_order,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] });
      qc.invalidateQueries({ queryKey: ['collections'] });
      setDialogOpen(false);
      toast.success(editing ? 'Coleção atualizada!' : 'Coleção criada!');
    },
    onError: () => toast.error('Erro ao salvar coleção.'),
  });

  const deleteCol = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('collections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] });
      toast.success('Coleção excluída.');
    },
  });

  const toggleCol = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('collections').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'collections'] }),
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: DBCollection) => {
    setEditing(c.id);
    setForm({
      name: c.name, slug: c.slug, description: c.description,
      collection_type: c.collection_type, image: c.image || '',
      is_active: c.is_active, sort_order: c.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsert.mutate({ ...form, id: editing || undefined });
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const filtered = collections?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Coleções</h1>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Nova Coleção</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 font-body" />
      </div>

      <div className="bg-card rounded-lg shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slug</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ordem</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">Nenhuma coleção encontrada.</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-body text-sm font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{c.slug}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground capitalize">{c.collection_type}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{c.sort_order}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleCol.mutate({ id: c.id, is_active: !c.is_active })} className="flex items-center gap-1.5">
                      {c.is_active ? (
                        <><ToggleRight className="w-5 h-5 text-primary" /><span className="text-xs font-body text-primary">Ativa</span></>
                      ) : (
                        <><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span className="text-xs font-body text-muted-foreground">Inativa</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir coleção?</AlertDialogTitle>
                            <AlertDialogDescription>"{c.name}" será removida permanentemente.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCol.mutate(c.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Editar Coleção' : 'Nova Coleção'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-body text-sm font-medium text-foreground">Nome</label>
              <Input
                value={form.name}
                onChange={e => {
                  const name = e.target.value;
                  setForm(f => ({ ...f, name, slug: editing ? f.slug : autoSlug(name) }));
                }}
                required className="font-body mt-1"
              />
            </div>
            <div>
              <label className="font-body text-sm font-medium text-foreground">Slug</label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required className="font-body mt-1" />
            </div>
            <div>
              <label className="font-body text-sm font-medium text-foreground">Descrição</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="font-body mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-body text-sm font-medium text-foreground">Tipo</label>
                <Select value={form.collection_type} onValueChange={v => setForm(f => ({ ...f, collection_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automatic">Automática</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-body text-sm font-medium text-foreground">Ordem</label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="font-body mt-1" />
              </div>
            </div>
            <div>
              <label className="font-body text-sm font-medium text-foreground">Imagem</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                  e.target.value = '';
                }}
              />
              {form.image ? (
                <div className="mt-2 relative group w-full">
                  <img
                    src={form.image}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-md border border-border"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-2 w-full h-32 border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {uploading ? (
                    <span className="font-body text-sm">Enviando...</span>
                  ) : (
                    <>
                      <Upload className="w-6 h-6" />
                      <span className="font-body text-sm">Clique para enviar</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCollections;
