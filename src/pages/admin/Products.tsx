import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ToggleLeft, ToggleRight, Pencil, Trash2, Download, Upload, FileDown, Image, X } from 'lucide-react';
import { useAdminProducts, useDeleteProduct, useToggleProduct, formatCurrency } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import BulkImageUpload from '@/components/admin/BulkImageUpload';

/* ── CSV helpers ── */

function detectSeparator(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === sep) { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

function parsePrice(val: string): number {
  // Handle Brazilian format: "49,90" → 49.90
  const normalized = val.replace(/\./g, '').replace(',', '.');
  return Number(normalized) || 0;
}

function findCol(headers: string[], ...aliases: string[]) {
  return headers.findIndex(h => aliases.some(a => h.includes(a)));
}

type ParsedRow = {
  name: string;
  slug: string;
  sku: string | null;
  cost_price: number;
  retail_price: number;
  stock: number;
  description: string;
  short_description: string;
  badge: string | null;
  status: string;
  is_active: boolean;
  ideal_for_resale: boolean;
  suggested_margin: number;
  rating: number;
  reviews_count: number;
  seo_title: string;
  meta_description: string;
  images: string[];
};

function parseRows(text: string): { valid: ParsedRow[]; skipped: { line: number; reason: string }[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { valid: [], skipped: [] };

  const sep = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], sep).map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  const nameIdx = findCol(headers, 'nome', 'name');
  const skuIdx = findCol(headers, 'sku');
  const costPriceIdx = findCol(headers, 'preco custo', 'cost_price', 'custo');
  const priceIdx = findCol(headers, 'preco venda', 'preco', 'price', 'retail_price');
  const stockIdx = findCol(headers, 'estoque', 'stock');
  const descIdx = findCol(headers, 'descricao', 'description');
  const shortDescIdx = findCol(headers, 'descricao curta', 'short_description', 'descricao_curta');
  const badgeIdx = findCol(headers, 'badge', 'selo');
  const statusIdx = findCol(headers, 'status');
  const revendaIdx = findCol(headers, 'revenda', 'ideal_for_resale');
  const margemIdx = findCol(headers, 'margem sugerida', 'suggested_margin', 'margem');
  const ratingIdx = findCol(headers, 'rating');
  const reviewsIdx = findCol(headers, 'reviews', 'reviews_count');
  const seoTitleIdx = findCol(headers, 'seo titulo', 'seo_title');
  const metaDescIdx = findCol(headers, 'meta descricao', 'meta_description');
  const imagesIdx = findCol(headers, 'imagens', 'images', 'fotos');
  const img1Idx = findCol(headers, 'imagem 1', 'image 1');
  const img2Idx = findCol(headers, 'imagem 2', 'image 2');
  const img3Idx = findCol(headers, 'imagem 3', 'image 3');
  const img4Idx = findCol(headers, 'imagem 4', 'image 4');
  const img5Idx = findCol(headers, 'imagem 5', 'image 5');
  const img6Idx = findCol(headers, 'imagem 6', 'image 6');
  const hasIndividualImgCols = img1Idx !== -1;
  if (nameIdx === -1) return { valid: [], skipped: [{ line: 1, reason: 'Coluna "Nome" não encontrada' }] };

  const valid: ParsedRow[] = [];
  const skipped: { line: number; reason: string }[] = [];

  lines.slice(1).forEach((line, i) => {
    const cols = parseCSVLine(line, sep);
    const name = cols[nameIdx] || '';
    if (!name) { skipped.push({ line: i + 2, reason: 'Nome vazio' }); return; }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const statusRaw = statusIdx >= 0 ? (cols[statusIdx] || '').toLowerCase() : '';
    const isActiveFromStatus = statusRaw === 'inativo' || statusRaw === 'inactive' ? false : true;
    const dbStatus = statusRaw === 'publicado' || statusRaw === 'published' || statusRaw === 'ativo' || statusRaw === 'active' ? 'published' : 'draft';

    const revendaRaw = revendaIdx >= 0 ? (cols[revendaIdx] || '').toLowerCase() : '';

    valid.push({
      name,
      slug,
      sku: skuIdx >= 0 ? cols[skuIdx] || null : null,
      cost_price: costPriceIdx >= 0 ? parsePrice(cols[costPriceIdx] || '0') : 0,
      retail_price: priceIdx >= 0 ? parsePrice(cols[priceIdx] || '0') : 0,
      stock: stockIdx >= 0 ? Number(cols[stockIdx]) || 0 : 0,
      description: descIdx >= 0 ? cols[descIdx] || '' : '',
      short_description: shortDescIdx >= 0 ? cols[shortDescIdx] || '' : '',
      badge: badgeIdx >= 0 ? cols[badgeIdx] || null : null,
      images: hasIndividualImgCols
        ? [img1Idx, img2Idx, img3Idx, img4Idx, img5Idx, img6Idx].map(idx => idx >= 0 ? (cols[idx] || '').trim() : '').filter(Boolean)
        : imagesIdx >= 0 ? (cols[imagesIdx] || '').split('|').map(u => u.trim()).filter(Boolean) : [],
      status: dbStatus,
      is_active: isActiveFromStatus,
      ideal_for_resale: revendaRaw === 'sim' || revendaRaw === 'yes' || revendaRaw === 'true' || revendaRaw === '1',
      suggested_margin: margemIdx >= 0 ? parsePrice(cols[margemIdx] || '0') : 0,
      rating: ratingIdx >= 0 ? parsePrice(cols[ratingIdx] || '0') : 0,
      reviews_count: reviewsIdx >= 0 ? Number(cols[reviewsIdx]) || 0 : 0,
      seo_title: seoTitleIdx >= 0 ? cols[seoTitleIdx] || '' : '',
      meta_description: metaDescIdx >= 0 ? cols[metaDescIdx] || '' : '',
    });
  });

  return { valid, skipped };
}

function downloadTemplate() {
  const csv = '\uFEFF' + [
    'Nome;SKU;Preco Custo;Preco Venda;Estoque;Descricao Curta;Descricao;Badge;Status;Revenda;Margem Sugerida;Rating;Reviews;SEO Titulo;Meta Descricao;Imagem 1;Imagem 2;Imagem 3;Imagem 4;Imagem 5;Imagem 6',
    'Batom Matte Rosa;SKU-001;25,00;49,90;100;Batom matte;Batom de longa duracao com acabamento matte;Mais Vendido;ativo;sim;50;4.8;120;Batom Matte Rosa - Levres;Batom matte de longa duracao;https://exemplo.com/foto1.jpg;https://exemplo.com/foto2.jpg;;;;',
    'Gloss Labial Nude;SKU-002;18,00;39,90;50;Gloss nude;Gloss com brilho natural;;ativo;nao;0;0;0;;;;;;;',
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'modelo-produtos.csv'; a.click();
  URL.revokeObjectURL(url);
}

/* ── Component ── */

const Products = () => {
  const { data: products, isLoading } = useAdminProducts();
  const deleteProduct = useDeleteProduct();
  const toggleProduct = useToggleProduct();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkImageOpen, setBulkImageOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ valid: ParsedRow[]; skipped: { line: number; reason: string }[] }>({ valid: [], skipped: [] });

  const filtered = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  // Clear selection when search changes
  useEffect(() => { setSelectedIds(new Set()); }, [search]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(p => p.id)));
  };

  const confirmBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const { error } = await supabase.from('products').delete().in('id', Array.from(selectedIds));
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast.success(`${selectedIds.size} produto(s) excluído(s)!`);
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || 'Tente novamente.'));
    } finally {
      setBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Nome', 'SKU', 'Preco Custo', 'Preco Venda', 'Estoque', 'Descricao Curta', 'Descricao', 'Badge', 'Status', 'Revenda', 'Margem Sugerida', 'Rating', 'Reviews', 'SEO Titulo', 'Meta Descricao', 'Imagem 1', 'Imagem 2', 'Imagem 3', 'Imagem 4', 'Imagem 5', 'Imagem 6'];
    const rows = filtered.map(p => {
      const imgs = p.images || [];
      return [
        p.name, p.sku || '', (p as any).cost_price || 0, p.retail_price, p.stock,
        p.short_description || '', p.description || '', p.badge || '',
        p.is_active ? 'ativo' : 'inativo',
        p.ideal_for_resale ? 'sim' : 'nao', p.suggested_margin || 0,
        p.rating || 0, p.reviews_count || 0,
        p.seo_title || '', p.meta_description || '',
        imgs[0] || '', imgs[1] || '', imgs[2] || '', imgs[3] || '', imgs[4] || '', imgs[5] || '',
      ];
    });
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'produtos.csv'; a.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = parseRows(text);
      if (!result.valid.length && !result.skipped.length) {
        toast.error('CSV vazio ou sem dados.');
        return;
      }
      if (!result.valid.length) {
        toast.error('Nenhum produto válido encontrado. Verifique se a coluna "Nome" existe.');
        return;
      }
      setPreviewData(result);
      setPreviewOpen(true);
    } catch {
      toast.error('Erro ao ler o arquivo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    setImporting(true);
    setPreviewOpen(false);
    let successCount = 0;
    let failCount = 0;
    try {
      // Insert in batches of 20 to avoid payload limits and get better error handling
      const batch = 20;
      for (let i = 0; i < previewData.valid.length; i += batch) {
        const chunk = previewData.valid.slice(i, i + batch);
        const { error } = await supabase.from('products').insert(chunk as any[]);
        if (error) {
          console.error('Import batch error:', error);
          failCount += chunk.length;
        } else {
          successCount += chunk.length;
        }
      }
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      if (successCount > 0) toast.success(`${successCount} produto(s) importado(s)!`);
      if (failCount > 0) toast.error(`${failCount} produto(s) falharam. Verifique se não há SKUs duplicados.`);
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error('Erro na importação: ' + (err.message || 'Tente novamente.'));
    } finally {
      setImporting(false);
      setPreviewData({ valid: [], skipped: [] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Produtos</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <FileDown className="w-4 h-4 mr-2" /> Baixar Modelo
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" /> {importing ? 'Importando...' : 'Importar CSV'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkImageOpen(true)}>
            <Image className="w-4 h-4 mr-2" /> Upload Imagens
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> Exportar</Button>
          <Button size="sm" asChild>
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

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-muted/80 border border-border rounded-lg px-4 py-2">
          <span className="font-body text-sm text-foreground font-medium">{selectedIds.size} produto(s) selecionado(s)</span>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" /> Excluir selecionados
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            <X className="w-4 h-4 mr-2" /> Limpar seleção
          </Button>
        </div>
      )}

      <div className="bg-card rounded-lg shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleAll}
                  />
                </th>
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
                <tr><td colSpan={8} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center font-body text-sm text-muted-foreground">Nenhum produto encontrado.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedIds.has(p.id)}
                      onCheckedChange={() => toggleSelect(p.id)}
                    />
                  </td>
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

      {/* Import Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmar importação</DialogTitle>
            <DialogDescription>
              {previewData.valid.length} produto(s) válido(s) encontrado(s).
              {previewData.skipped.length > 0 && ` ${previewData.skipped.length} linha(s) ignorada(s).`}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-2 font-body text-xs text-muted-foreground">Nome</th>
                  <th className="text-left px-3 py-2 font-body text-xs text-muted-foreground">SKU</th>
                  <th className="text-left px-3 py-2 font-body text-xs text-muted-foreground">Custo</th>
                  <th className="text-left px-3 py-2 font-body text-xs text-muted-foreground">Venda</th>
                  <th className="text-left px-3 py-2 font-body text-xs text-muted-foreground">Estoque</th>
                  <th className="text-left px-3 py-2 font-body text-xs text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewData.valid.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-3 py-2 font-body text-foreground">{row.name}</td>
                    <td className="px-3 py-2 font-body text-muted-foreground">{row.sku || '—'}</td>
                    <td className="px-3 py-2 font-body text-foreground">R$ {row.cost_price.toFixed(2)}</td>
                    <td className="px-3 py-2 font-body text-foreground">R$ {row.retail_price.toFixed(2)}</td>
                    <td className="px-3 py-2 font-body text-foreground">{row.stock}</td>
                    <td className="px-3 py-2 font-body text-muted-foreground">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.valid.length > 5 && (
              <p className="text-xs text-muted-foreground px-3 py-2">...e mais {previewData.valid.length - 5} produto(s)</p>
            )}
          </div>

          {previewData.skipped.length > 0 && (
            <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold">Linhas ignoradas:</p>
              {previewData.skipped.map((s, i) => (
                <p key={i}>Linha {s.line}: {s.reason}</p>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancelar</Button>
            <Button onClick={confirmImport} disabled={importing}>
              {importing ? 'Importando...' : `Importar ${previewData.valid.length} produto(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkImageUpload open={bulkImageOpen} onOpenChange={setBulkImageOpen} />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} produto(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os produtos selecionados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Products;
