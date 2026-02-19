import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { DBProduct, DBVariant, DBPriceRule } from '@/hooks/useProducts';

interface FormData {
  name: string;
  slug: string;
  sku: string;
  short_description: string;
  description: string;
  retail_price: string;
  stock: string;
  badge: string;
  is_active: boolean;
  ideal_for_resale: boolean;
  suggested_margin: string;
  rating: string;
  reviews_count: string;
}

const emptyForm: FormData = {
  name: '', slug: '', sku: '', short_description: '', description: '',
  retail_price: '', stock: '0', badge: '', is_active: true,
  ideal_for_resale: false, suggested_margin: '0', rating: '0', reviews_count: '0',
};

interface VariantRow { id?: string; name: string; sku: string; stock: string; }
interface PriceRuleRow { id?: string; min_quantity: string; price: string; label: string; }

const ProductForm = () => {
  const { id } = useParams();
  const isNew = !id || id === 'novo';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [priceRules, setPriceRules] = useState<PriceRuleRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data: p } = await supabase.from('products').select('*').eq('id', id).single();
      if (!p) { navigate('/admin/produtos'); return; }
      const product = p as DBProduct;
      setForm({
        name: product.name, slug: product.slug, sku: product.sku || '',
        short_description: product.short_description, description: product.description,
        retail_price: String(product.retail_price), stock: String(product.stock),
        badge: product.badge || '', is_active: product.is_active,
        ideal_for_resale: product.ideal_for_resale, suggested_margin: String(product.suggested_margin),
        rating: String(product.rating), reviews_count: String(product.reviews_count),
      });
      const { data: vs } = await supabase.from('product_variants').select('*').eq('product_id', id).order('sort_order');
      setVariants((vs as DBVariant[] || []).map(v => ({ id: v.id, name: v.name, sku: v.sku || '', stock: String(v.stock) })));
      const { data: pr } = await supabase.from('price_rules').select('*').eq('product_id', id).order('min_quantity');
      setPriceRules((pr as DBPriceRule[] || []).map(r => ({ id: r.id, min_quantity: String(r.min_quantity), price: String(r.price), label: r.label })));
      setLoading(false);
    })();
  }, [id, isNew, navigate]);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'name' && isNew) {
      const slug = (value as string).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setForm(prev => ({ ...prev, slug }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const productData = {
        name: form.name, slug: form.slug, sku: form.sku || null,
        short_description: form.short_description, description: form.description,
        retail_price: parseFloat(form.retail_price) || 0,
        stock: parseInt(form.stock) || 0, badge: form.badge || null,
        is_active: form.is_active, ideal_for_resale: form.ideal_for_resale,
        suggested_margin: parseFloat(form.suggested_margin) || 0,
        rating: parseFloat(form.rating) || 0,
        reviews_count: parseInt(form.reviews_count) || 0,
      };

      let productId = id;
      if (isNew) {
        const { data, error } = await supabase.from('products').insert(productData).select('id').single();
        if (error) throw error;
        productId = data.id;
      } else {
        const { error } = await supabase.from('products').update(productData).eq('id', id);
        if (error) throw error;
      }

      // Sync variants
      if (!isNew) {
        await supabase.from('product_variants').delete().eq('product_id', productId!);
      }
      if (variants.length > 0) {
        await supabase.from('product_variants').insert(
          variants.map((v, i) => ({
            product_id: productId!, name: v.name, sku: v.sku || null,
            stock: parseInt(v.stock) || 0, sort_order: i,
          }))
        );
      }

      // Sync price rules
      if (!isNew) {
        await supabase.from('price_rules').delete().eq('product_id', productId!);
      }
      if (priceRules.length > 0) {
        await supabase.from('price_rules').insert(
          priceRules.map(r => ({
            product_id: productId!, min_quantity: parseInt(r.min_quantity) || 0,
            price: parseFloat(r.price) || 0, label: r.label,
          }))
        );
      }

      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      navigate('/admin/produtos');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/produtos')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {isNew ? 'Novo Produto' : 'Editar Produto'}
        </h1>
      </div>

      {/* Basic info */}
      <section className="bg-card rounded-lg shadow-soft p-6 space-y-4">
        <h2 className="font-body text-sm font-semibold text-foreground">Informações Básicas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="font-body text-xs">Nome</Label>
            <Input value={form.name} onChange={e => updateField('name', e.target.value)} className="font-body" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs">Slug</Label>
            <Input value={form.slug} onChange={e => updateField('slug', e.target.value)} className="font-body" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs">SKU</Label>
            <Input value={form.sku} onChange={e => updateField('sku', e.target.value)} className="font-body" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs">Badge</Label>
            <Input value={form.badge} onChange={e => updateField('badge', e.target.value)} placeholder="Mais Vendido, Novo, Oferta" className="font-body" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-xs">Descrição Curta</Label>
          <Input value={form.short_description} onChange={e => updateField('short_description', e.target.value)} className="font-body" />
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-xs">Descrição Completa</Label>
          <Textarea value={form.description} onChange={e => updateField('description', e.target.value)} rows={4} className="font-body" />
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-card rounded-lg shadow-soft p-6 space-y-4">
        <h2 className="font-body text-sm font-semibold text-foreground">Preço e Estoque</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="font-body text-xs">Preço Varejo (R$)</Label>
            <Input type="number" step="0.01" value={form.retail_price} onChange={e => updateField('retail_price', e.target.value)} className="font-body" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs">Estoque</Label>
            <Input type="number" value={form.stock} onChange={e => updateField('stock', e.target.value)} className="font-body" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs">Rating</Label>
            <Input type="number" step="0.1" max="5" value={form.rating} onChange={e => updateField('rating', e.target.value)} className="font-body" />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs">Reviews</Label>
            <Input type="number" value={form.reviews_count} onChange={e => updateField('reviews_count', e.target.value)} className="font-body" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={v => updateField('is_active', v)} />
            <Label className="font-body text-sm">Ativo</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.ideal_for_resale} onCheckedChange={v => updateField('ideal_for_resale', v)} />
            <Label className="font-body text-sm">Ideal para Revenda</Label>
          </div>
        </div>
        {form.ideal_for_resale && (
          <div className="space-y-1.5 max-w-xs">
            <Label className="font-body text-xs">Margem Sugerida (%)</Label>
            <Input type="number" value={form.suggested_margin} onChange={e => updateField('suggested_margin', e.target.value)} className="font-body" />
          </div>
        )}
      </section>

      {/* Variants */}
      <section className="bg-card rounded-lg shadow-soft p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-body text-sm font-semibold text-foreground">Variantes (Cores)</h2>
          <Button variant="outline" size="sm" onClick={() => setVariants([...variants, { name: '', sku: '', stock: '0' }])}>
            <Plus className="w-3 h-3 mr-1" /> Adicionar
          </Button>
        </div>
        {variants.map((v, i) => (
          <div key={i} className="flex items-center gap-3">
            <Input placeholder="Nome da cor" value={v.name} onChange={e => { const arr = [...variants]; arr[i].name = e.target.value; setVariants(arr); }} className="font-body flex-1" />
            <Input placeholder="SKU" value={v.sku} onChange={e => { const arr = [...variants]; arr[i].sku = e.target.value; setVariants(arr); }} className="font-body w-28" />
            <Input type="number" placeholder="Estoque" value={v.stock} onChange={e => { const arr = [...variants]; arr[i].stock = e.target.value; setVariants(arr); }} className="font-body w-24" />
            <Button variant="ghost" size="icon" onClick={() => setVariants(variants.filter((_, j) => j !== i))}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </section>

      {/* Price Rules */}
      <section className="bg-card rounded-lg shadow-soft p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-body text-sm font-semibold text-foreground">Regras de Preço</h2>
          <Button variant="outline" size="sm" onClick={() => setPriceRules([...priceRules, { min_quantity: '', price: '', label: '' }])}>
            <Plus className="w-3 h-3 mr-1" /> Adicionar
          </Button>
        </div>
        {priceRules.map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            <Input type="number" placeholder="Qtd mín." value={r.min_quantity} onChange={e => { const arr = [...priceRules]; arr[i].min_quantity = e.target.value; setPriceRules(arr); }} className="font-body w-24" />
            <Input type="number" step="0.01" placeholder="Preço (R$)" value={r.price} onChange={e => { const arr = [...priceRules]; arr[i].price = e.target.value; setPriceRules(arr); }} className="font-body w-32" />
            <Input placeholder="Label (ex: Box 06)" value={r.label} onChange={e => { const arr = [...priceRules]; arr[i].label = e.target.value; setPriceRules(arr); }} className="font-body flex-1" />
            <Button variant="ghost" size="icon" onClick={() => setPriceRules(priceRules.filter((_, j) => j !== i))}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </section>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/admin/produtos')}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Salvando...' : 'Salvar Produto'}
        </Button>
      </div>
    </div>
  );
};

export default ProductForm;
