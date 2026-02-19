import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ToggleLeft, ToggleRight, Pencil, Trash2, Download, Upload } from 'lucide-react';
import { useAdminProducts, useDeleteProduct, useToggleProduct, formatCurrency } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const Products = () => {
  const { data: products, isLoading } = useAdminProducts();
  const deleteProduct = useDeleteProduct();
  const toggleProduct = useToggleProduct();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Nome', 'SKU', 'Preço', 'Estoque', 'Status'];
    const rows = filtered.map(p => [p.name, p.sku || '', p.retail_price, p.stock, p.is_active ? 'Ativo' : 'Inativo']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'produtos.csv'; a.click();
  };

  const importCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV vazio ou sem dados.'); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h === 'nome' || h === 'name');
      const skuIdx = headers.findIndex(h => h === 'sku');
      const priceIdx = headers.findIndex(h => h.includes('preco') || h.includes('preço') || h === 'price' || h === 'retail_price');
      const stockIdx = headers.findIndex(h => h === 'estoque' || h === 'stock');
      const descIdx = headers.findIndex(h => h.includes('descri') || h === 'description');

      if (nameIdx === -1) { toast.error('Coluna "Nome" não encontrada no CSV.'); return; }

      const rows = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim());
        const name = cols[nameIdx] || '';
        if (!name) return null;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return {
          name,
          slug: slug + '-' + Date.now().toString(36),
          sku: skuIdx >= 0 ? cols[skuIdx] || null : null,
          retail_price: priceIdx >= 0 ? Number(cols[priceIdx]) || 0 : 0,
          stock: stockIdx >= 0 ? Number(cols[stockIdx]) || 0 : 0,
          description: descIdx >= 0 ? cols[descIdx] || '' : '',
          short_description: '',
        };
      }).filter(Boolean);

      if (!rows.length) { toast.error('Nenhum produto válido encontrado.'); return; }

      const { error } = await supabase.from('products').insert(rows as any[]);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast.success(`${rows.length} produto(s) importado(s)!`);
    } catch (err: any) {
      toast.error('Erro na importação: ' + (err.message || 'Tente novamente.'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Produtos</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" /> {importing ? 'Importando...' : 'Importar CSV'}
          </Button>
          <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> Exportar</Button>
          <Button asChild>
            <Link to="/admin/produtos/novo">
              <Plus className="w-4 h-4 mr-2" /> Novo Produto
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 font-body"
        />
      </div>

      <div className="bg-card rounded-lg shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produto</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">SKU</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preço</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estoque</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Variantes</th>
                <th className="text-left px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">Nenhum produto encontrado.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-body text-sm font-medium text-foreground">{p.name}</p>
                      {p.badge && <span className="text-[10px] font-body font-bold text-primary">{p.badge}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{p.sku || '—'}</td>
                  <td className="px-4 py-3 font-body text-sm text-foreground">{formatCurrency(p.retail_price)}</td>
                  <td className="px-4 py-3 font-body text-sm text-foreground">{p.stock}</td>
                  <td className="px-4 py-3 font-body text-sm text-muted-foreground">{p.variants.length} cores</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleProduct.mutate({ id: p.id, is_active: !p.is_active })}
                      className="flex items-center gap-1.5"
                    >
                      {p.is_active ? (
                        <><ToggleRight className="w-5 h-5 text-primary" /><span className="text-xs font-body text-primary">Ativo</span></>
                      ) : (
                        <><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span className="text-xs font-body text-muted-foreground">Inativo</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/admin/produtos/${p.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O produto "{p.name}" será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteProduct.mutate(p.id)}>
                              Excluir
                            </AlertDialogAction>
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
    </div>
  );
};

export default Products;
