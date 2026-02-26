import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DBProduct, DBVariant, DBPriceRule } from '@/hooks/useProducts';
import { useAutosave } from '@/hooks/useAutosave';

import TopBar from '@/components/admin/product-editor/TopBar';
import BasicInfoCard from '@/components/admin/product-editor/BasicInfoCard';
import MediaCard from '@/components/admin/product-editor/MediaCard';
import PricingCard from '@/components/admin/product-editor/PricingCard';
import VariantsCard, { type VariantRow } from '@/components/admin/product-editor/VariantsCard';
import PriceRulesCard, { type PriceRuleRow } from '@/components/admin/product-editor/PriceRulesCard';
import SidebarStatus from '@/components/admin/product-editor/SidebarStatus';
import SidebarCollections from '@/components/admin/product-editor/SidebarCollections';
import SidebarSEO from '@/components/admin/product-editor/SidebarSEO';
import SidebarStock from '@/components/admin/product-editor/SidebarStock';
import ProductPreviewDrawer from '@/components/admin/product-editor/ProductPreviewDrawer';

interface FormData {
  name: string;
  slug: string;
  sku: string;
  short_description: string;
  description: string;
  retail_price: string;
  cost_price: string;
  stock: string;
  badge: string;
  is_active: boolean;
  ideal_for_resale: boolean;
  suggested_margin: string;
  rating: string;
  reviews_count: string;
  status: string;
  published_at: string | null;
  seo_title: string;
  meta_description: string;
  images: string[];
}

const emptyForm: FormData = {
  name: '', slug: '', sku: '', short_description: '', description: '',
  retail_price: '', cost_price: '0', stock: '0', badge: '', is_active: false,
  ideal_for_resale: false, suggested_margin: '0', rating: '0', reviews_count: '0',
  status: 'draft', published_at: null, seo_title: '', meta_description: '', images: [],
};

const ProductForm = () => {
  const { id } = useParams();
  const isNew = !id || id === 'novo';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<FormData>(emptyForm);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [priceRules, setPriceRules] = useState<PriceRuleRow[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productId, setProductId] = useState<string | null>(isNew ? null : id!);

  // Load existing product
  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data: p } = await supabase.from('products').select('*').eq('id', id).single();
      if (!p) { navigate('/admin/produtos'); return; }
      const product = p as DBProduct;
      setForm({
        name: product.name, slug: product.slug, sku: product.sku || '',
        short_description: product.short_description, description: product.description,
        retail_price: String(product.retail_price), cost_price: String((product as any).cost_price || 0), stock: String(product.stock),
        badge: product.badge || '', is_active: product.is_active,
        ideal_for_resale: product.ideal_for_resale, suggested_margin: String(product.suggested_margin),
        rating: String(product.rating), reviews_count: String(product.reviews_count),
        status: product.status || 'draft', published_at: product.published_at || null,
        seo_title: product.seo_title || '', meta_description: product.meta_description || '',
        images: product.images || [],
      });
      const [{ data: vs }, { data: pr }, { data: colProds }] = await Promise.all([
        supabase.from('product_variants').select('*').eq('product_id', id).order('sort_order'),
        supabase.from('price_rules').select('*').eq('product_id', id).order('min_quantity'),
        supabase.from('collection_products').select('collection_id').eq('product_id', id),
      ]);
      setVariants((vs as DBVariant[] || []).map(v => ({
        id: v.id, name: v.name, sku: v.sku || '', stock: String(v.stock),
        price_override: v.price_override ? String(v.price_override) : '', images: v.images || [],
      })));
      setPriceRules((pr as DBPriceRule[] || []).map(r => ({
        id: r.id, min_quantity: String(r.min_quantity), price: String(r.price),
        label: r.label, is_active: r.is_active,
      })));
      setCollectionIds((colProds as any[] || []).map(cp => cp.collection_id));
      setLoading(false);
    })();
  }, [id, isNew, navigate]);

  const updateField = (field: string, value: string | boolean | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (requireImages = false): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nome é obrigatório';
    if (!form.slug.trim()) e.slug = 'Slug é obrigatório';
    if (!(parseFloat(form.retail_price) > 0)) e.retail_price = 'Preço deve ser maior que 0';
    if (requireImages && form.images.length === 0) e.images = 'Adicione pelo menos 1 imagem para publicar';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildProductData = () => ({
    name: form.name, slug: form.slug, sku: form.sku || null,
    short_description: form.short_description, description: form.description,
    retail_price: parseFloat(form.retail_price) || 0,
    cost_price: parseFloat(form.cost_price) || 0,
    stock: parseInt(form.stock) || 0, badge: form.badge || null,
    is_active: form.status === 'published',
    ideal_for_resale: form.ideal_for_resale,
    suggested_margin: parseFloat(form.suggested_margin) || 0,
    rating: parseFloat(form.rating) || 0,
    reviews_count: parseInt(form.reviews_count) || 0,
    status: form.status,
    published_at: form.published_at,
    seo_title: form.seo_title,
    meta_description: form.meta_description,
    images: form.images,
  });

  const saveProduct = useCallback(async (redirect = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const productData = buildProductData();
      let pid = productId;

      if (isNew && !pid) {
        const { data, error } = await supabase.from('products').insert(productData).select('id').single();
        if (error) throw error;
        pid = data.id;
        setProductId(pid);
      } else {
        const { error } = await supabase.from('products').update(productData).eq('id', pid!);
        if (error) throw error;
      }

      // Sync variants
      await supabase.from('product_variants').delete().eq('product_id', pid!);
      if (variants.length > 0) {
        await supabase.from('product_variants').insert(
          variants.map((v, i) => ({
            product_id: pid!, name: v.name, sku: v.sku || null,
            stock: parseInt(v.stock) || 0, sort_order: i,
            price_override: v.price_override ? parseFloat(v.price_override) : null,
            images: v.images || [],
          }))
        );
      }

      // Sync price rules
      await supabase.from('price_rules').delete().eq('product_id', pid!);
      if (priceRules.length > 0) {
        await supabase.from('price_rules').insert(
          priceRules.map(r => ({
            product_id: pid!, min_quantity: parseInt(r.min_quantity) || 0,
            price: parseFloat(r.price) || 0, label: r.label, is_active: r.is_active,
          }))
        );
      }

      // Sync collections
      await supabase.from('collection_products').delete().eq('product_id', pid!);
      if (collectionIds.length > 0) {
        await supabase.from('collection_products').insert(
          collectionIds.map(cid => ({ product_id: pid!, collection_id: cid }))
        );
      }

      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast.success('Produto salvo com sucesso!');
      autosave.markSaved();

      if (redirect) {
        navigate('/admin/produtos');
      } else if (isNew && pid) {
        navigate(`/admin/produtos/${pid}`, { replace: true });
      }
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [form, variants, priceRules, collectionIds, productId, isNew, navigate, qc]);

  // Autosave
  const autosaveData = { form, variants, priceRules, collectionIds };
  const autosave = useAutosave({
    data: autosaveData,
    onSave: async () => { await saveProduct(false); },
    enabled: !!productId,
  });

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProduct(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveProduct]);

  const handlePublish = () => {
    if (!validate(true)) {
      toast.error('Preencha os campos obrigatórios para publicar');
      return;
    }
    setForm(prev => ({ ...prev, status: 'published', published_at: new Date().toISOString(), is_active: true }));
    // Save after state update
    setTimeout(() => saveProduct(false), 50);
  };

  const handleUnpublish = () => {
    setForm(prev => ({ ...prev, status: 'draft', is_active: false }));
    setTimeout(() => saveProduct(false), 50);
  };

  const handleDuplicate = async () => {
    if (!productId) return;
    setSaving(true);
    try {
      const cloneData = { ...buildProductData(), status: 'draft', is_active: false, published_at: null };
      // Generate unique slug
      let newSlug = `${form.slug}-copia`;
      const { data: existing } = await supabase.from('products').select('slug').like('slug', `${form.slug}-copia%`);
      if (existing && existing.length > 0) {
        newSlug = `${form.slug}-copia-${existing.length + 1}`;
      }
      cloneData.slug = newSlug;
      cloneData.name = `${form.name} (Cópia)`;

      const { data: newProd, error } = await supabase.from('products').insert(cloneData).select('id').single();
      if (error) throw error;

      // Clone variants
      if (variants.length > 0) {
        await supabase.from('product_variants').insert(
          variants.map((v, i) => ({
            product_id: newProd.id, name: v.name, sku: v.sku || null,
            stock: parseInt(v.stock) || 0, sort_order: i,
            price_override: v.price_override ? parseFloat(v.price_override) : null,
          }))
        );
      }

      // Clone price rules
      if (priceRules.length > 0) {
        await supabase.from('price_rules').insert(
          priceRules.map(r => ({
            product_id: newProd.id, min_quantity: parseInt(r.min_quantity) || 0,
            price: parseFloat(r.price) || 0, label: r.label, is_active: r.is_active,
          }))
        );
      }

      // Clone collection relations
      if (collectionIds.length > 0) {
        await supabase.from('collection_products').insert(
          collectionIds.map(cid => ({ product_id: newProd.id, collection_id: cid }))
        );
      }

      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast.success('Produto duplicado!');
      navigate(`/admin/produtos/${newProd.id}`);
    } catch (err: any) {
      toast.error('Erro ao duplicar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-0">
      <TopBar
        productName={form.name}
        isNew={isNew}
        status={form.status}
        autosaveStatus={autosave.status}
        saving={saving}
        onSave={() => saveProduct(true)}
        onSaveAndContinue={() => saveProduct(false)}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onPreview={() => setPreviewOpen(true)}
        onDuplicate={handleDuplicate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <BasicInfoCard
            name={form.name} slug={form.slug} sku={form.sku} badge={form.badge}
            short_description={form.short_description} description={form.description}
            isNew={isNew} errors={errors}
            onChange={(f, v) => updateField(f, v)}
          />
          <MediaCard
            images={form.images}
            productId={productId}
            onChange={imgs => updateField('images', imgs)}
            errors={errors}
          />
          <PricingCard
            retail_price={form.retail_price} cost_price={form.cost_price}
            stock={form.stock} rating={form.rating} reviews_count={form.reviews_count}
            errors={errors}
            onChange={(f, v) => updateField(f, v)}
          />
          <VariantsCard variants={variants} onChange={setVariants} />
          <PriceRulesCard priceRules={priceRules} retailPrice={form.retail_price} onChange={setPriceRules} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SidebarStatus
            status={form.status}
            publishedAt={form.published_at}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
          />
          <SidebarCollections selectedIds={collectionIds} onChange={setCollectionIds} />
          <SidebarSEO
            slug={form.slug} seo_title={form.seo_title}
            meta_description={form.meta_description} errors={errors}
            onChange={(f, v) => updateField(f, v)}
          />
          <SidebarStock
            stock={form.stock} variants={variants}
            ideal_for_resale={form.ideal_for_resale}
            suggested_margin={form.suggested_margin}
            onChange={(f, v) => updateField(f, v)}
          />
        </div>
      </div>

      <ProductPreviewDrawer
        open={previewOpen} onClose={() => setPreviewOpen(false)}
        name={form.name} images={form.images} retail_price={form.retail_price}
        description={form.description} short_description={form.short_description}
        badge={form.badge} rating={form.rating} reviews_count={form.reviews_count}
        ideal_for_resale={form.ideal_for_resale} suggested_margin={form.suggested_margin}
        variants={variants} priceRules={priceRules}
      />
    </div>
  );
};

export default ProductForm;
