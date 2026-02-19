import { useState, useEffect } from 'react';
import { Save, Truck, Palette, Type, Plus, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import { useStoreSettings, useShippingRules } from '@/hooks/useStoreSettings';

// ─── Component ────────────────────────────────────────────
const AdminSettings = () => {
  const qc = useQueryClient();
  const { data: settings, isLoading: loadingSettings } = useStoreSettings();
  const { data: shippingRules, isLoading: loadingShipping } = useShippingRules();

  // Brand settings
  const [brandName, setBrandName] = useState('');
  const [brandTagline, setBrandTagline] = useState('');

  // Hero settings
  const [heroHeadline, setHeroHeadline] = useState('');
  const [heroSubheadline, setHeroSubheadline] = useState('');
  const [heroCtaText, setHeroCtaText] = useState('');
  const [heroCtaLink, setHeroCtaLink] = useState('');

  // Shipping form
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleType, setNewRuleType] = useState('fixed');
  const [newRuleValue, setNewRuleValue] = useState('0');
  const [newRuleState, setNewRuleState] = useState('');
  const [newRuleFreeMin, setNewRuleFreeMin] = useState('');

  useEffect(() => {
    if (settings) {
      const brand = (settings.brand || {}) as any;
      setBrandName(brand.name || '');
      setBrandTagline(brand.tagline || '');
      const hero = (settings.hero || {}) as any;
      setHeroHeadline(hero.headline || '');
      setHeroSubheadline(hero.subheadline || '');
      setHeroCtaText(hero.cta_text || '');
      setHeroCtaLink(hero.cta_link || '');
    }
  }, [settings]);

  const saveSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase.from('store_settings').upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store_settings'] });
      toast.success('Configuração salva!');
    },
    onError: () => toast.error('Erro ao salvar.'),
  });

  const saveBrand = () => saveSetting.mutate({ key: 'brand', value: { name: brandName, tagline: brandTagline } });
  const saveHero = () => saveSetting.mutate({ key: 'hero', value: { headline: heroHeadline, subheadline: heroSubheadline, cta_text: heroCtaText, cta_link: heroCtaLink } });

  // Shipping mutations
  const addShippingRule = useMutation({
    mutationFn: async () => {
      const payload = {
        name: newRuleName || (newRuleType === 'fixed' ? 'Frete Fixo' : newRuleType === 'free_above' ? 'Frete Grátis' : 'Frete por Estado'),
        rule_type: newRuleType,
        value: Number(newRuleValue),
        state: newRuleType === 'by_state' ? newRuleState : null,
        min_order_for_free: newRuleType === 'free_above' ? Number(newRuleFreeMin) : null,
        is_active: true,
      };
      const { error } = await supabase.from('shipping_rules').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'shipping_rules'] });
      setNewRuleName(''); setNewRuleValue('0'); setNewRuleState(''); setNewRuleFreeMin('');
      toast.success('Regra de frete adicionada!');
    },
    onError: () => toast.error('Erro ao adicionar regra.'),
  });

  const deleteShippingRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shipping_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'shipping_rules'] });
      toast.success('Regra removida.');
    },
  });

  if (loadingSettings) {
    return <div className="flex items-center justify-center py-20 font-body text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Configurações</h1>

      <Tabs defaultValue="brand" className="space-y-6">
        <TabsList>
          <TabsTrigger value="brand" className="font-body"><Palette className="w-4 h-4 mr-1.5" /> Marca</TabsTrigger>
          <TabsTrigger value="hero" className="font-body"><Type className="w-4 h-4 mr-1.5" /> Hero / Home</TabsTrigger>
          <TabsTrigger value="shipping" className="font-body"><Truck className="w-4 h-4 mr-1.5" /> Frete</TabsTrigger>
        </TabsList>

        {/* ─── Brand ─────────────────────────────── */}
        <TabsContent value="brand">
          <div className="bg-card rounded-lg shadow-soft p-6 space-y-4 max-w-xl">
            <h2 className="font-display text-lg font-semibold text-foreground">Identidade da Marca</h2>
            <div>
              <label className="font-body text-sm font-medium text-foreground">Nome da Loja</label>
              <Input value={brandName} onChange={e => setBrandName(e.target.value)} className="font-body mt-1" />
            </div>
            <div>
              <label className="font-body text-sm font-medium text-foreground">Tagline</label>
              <Input value={brandTagline} onChange={e => setBrandTagline(e.target.value)} className="font-body mt-1" />
            </div>
            <Button onClick={saveBrand} disabled={saveSetting.isPending}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </div>
        </TabsContent>

        {/* ─── Hero ──────────────────────────────── */}
        <TabsContent value="hero">
          <div className="bg-card rounded-lg shadow-soft p-6 space-y-4 max-w-xl">
            <h2 className="font-display text-lg font-semibold text-foreground">Conteúdo da Home</h2>
            <div>
              <label className="font-body text-sm font-medium text-foreground">Headline</label>
              <Input value={heroHeadline} onChange={e => setHeroHeadline(e.target.value)} className="font-body mt-1" />
            </div>
            <div>
              <label className="font-body text-sm font-medium text-foreground">Sub-headline</label>
              <Textarea value={heroSubheadline} onChange={e => setHeroSubheadline(e.target.value)} className="font-body mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-body text-sm font-medium text-foreground">Texto do CTA</label>
                <Input value={heroCtaText} onChange={e => setHeroCtaText(e.target.value)} className="font-body mt-1" />
              </div>
              <div>
                <label className="font-body text-sm font-medium text-foreground">Link do CTA</label>
                <Input value={heroCtaLink} onChange={e => setHeroCtaLink(e.target.value)} className="font-body mt-1" placeholder="/colecoes" />
              </div>
            </div>
            <Button onClick={saveHero} disabled={saveSetting.isPending}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </div>
        </TabsContent>

        {/* ─── Shipping ──────────────────────────── */}
        <TabsContent value="shipping">
          <div className="space-y-6">
            {/* Existing rules */}
            <div className="bg-card rounded-lg shadow-soft p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Regras de Frete</h2>
              {loadingShipping ? (
                <p className="font-body text-sm text-muted-foreground">Carregando...</p>
              ) : !shippingRules?.length ? (
                <p className="font-body text-sm text-muted-foreground">Nenhuma regra configurada. Adicione abaixo.</p>
              ) : (
                <div className="space-y-2">
                  {shippingRules.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-md px-4 py-3">
                      <div>
                        <span className="font-body text-sm font-medium text-foreground">{r.name}</span>
                        <span className="font-body text-xs text-muted-foreground ml-2">
                          {r.rule_type === 'fixed' && `R$ ${r.value.toFixed(2)}`}
                          {r.rule_type === 'by_state' && `${r.state}: R$ ${r.value.toFixed(2)}`}
                          {r.rule_type === 'free_above' && `Grátis acima de R$ ${r.min_order_for_free?.toFixed(2)}`}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteShippingRule.mutate(r.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add new rule */}
            <div className="bg-card rounded-lg shadow-soft p-6 space-y-4 max-w-xl">
              <h2 className="font-display text-lg font-semibold text-foreground">Adicionar Regra</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-sm font-medium text-foreground">Nome</label>
                  <Input value={newRuleName} onChange={e => setNewRuleName(e.target.value)} className="font-body mt-1" placeholder="Frete Padrão" />
                </div>
                <div>
                  <label className="font-body text-sm font-medium text-foreground">Tipo</label>
                  <Select value={newRuleType} onValueChange={setNewRuleType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixo</SelectItem>
                      <SelectItem value="by_state">Por Estado</SelectItem>
                      <SelectItem value="free_above">Grátis acima de</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {newRuleType === 'by_state' && (
                <div>
                  <label className="font-body text-sm font-medium text-foreground">Estado (UF)</label>
                  <Input value={newRuleState} onChange={e => setNewRuleState(e.target.value)} className="font-body mt-1" placeholder="SP" maxLength={2} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-sm font-medium text-foreground">
                    {newRuleType === 'free_above' ? 'Valor do frete (quando abaixo)' : 'Valor (R$)'}
                  </label>
                  <Input type="number" step="0.01" min="0" value={newRuleValue} onChange={e => setNewRuleValue(e.target.value)} className="font-body mt-1" />
                </div>
                {newRuleType === 'free_above' && (
                  <div>
                    <label className="font-body text-sm font-medium text-foreground">Mínimo para frete grátis</label>
                    <Input type="number" step="0.01" min="0" value={newRuleFreeMin} onChange={e => setNewRuleFreeMin(e.target.value)} className="font-body mt-1" />
                  </div>
                )}
              </div>
              <Button onClick={() => addShippingRule.mutate()} disabled={addShippingRule.isPending}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar Regra
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
