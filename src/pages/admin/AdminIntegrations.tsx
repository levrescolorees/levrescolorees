import { useState, useEffect } from 'react';
import { Save, CreditCard, CheckCircle2, AlertCircle, Eye, EyeOff, Truck } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAdminStoreSettings } from '@/hooks/useStoreSettings';

interface MercadoPagoSettings {
  public_key?: string;
  access_token?: string;
  environment?: 'sandbox' | 'production';
  enabled?: boolean;
  pix_enabled?: boolean;
  card_enabled?: boolean;
  boleto_enabled?: boolean;
  max_installments?: number;
  webhook_secret?: string;
}

interface SuperFreteSettings {
  enabled?: boolean;
  environment?: 'sandbox' | 'production';
  origin_zip?: string;
  services?: string[];
}

const AdminIntegrations = () => {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useAdminStoreSettings();

  const [mpPublicKey, setMpPublicKey] = useState('');
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpEnvironment, setMpEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [mpEnabled, setMpEnabled] = useState(false);
  const [mpPixEnabled, setMpPixEnabled] = useState(true);
  const [mpCardEnabled, setMpCardEnabled] = useState(true);
  const [mpBoletoEnabled, setMpBoletoEnabled] = useState(true);
  const [mpMaxInstallments, setMpMaxInstallments] = useState('12');
  const [mpWebhookSecret, setMpWebhookSecret] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  useEffect(() => {
    if (settings?.mercado_pago) {
      const mp = settings.mercado_pago as MercadoPagoSettings;
      setMpPublicKey(mp.public_key || '');
      setMpAccessToken(mp.access_token || '');
      setMpEnvironment(mp.environment || 'sandbox');
      setMpEnabled(mp.enabled ?? false);
      setMpPixEnabled(mp.pix_enabled ?? true);
      setMpCardEnabled(mp.card_enabled ?? true);
      setMpBoletoEnabled(mp.boleto_enabled ?? true);
      setMpMaxInstallments(String(mp.max_installments || 12));
      setMpWebhookSecret(mp.webhook_secret || '');
    }
  }, [settings]);

  const saveMp = useMutation({
    mutationFn: async () => {
      const value = {
        public_key: mpPublicKey,
        access_token: mpAccessToken,
        environment: mpEnvironment,
        enabled: mpEnabled,
        pix_enabled: mpPixEnabled,
        card_enabled: mpCardEnabled,
        boleto_enabled: mpBoletoEnabled,
        max_installments: Number(mpMaxInstallments),
        webhook_secret: mpWebhookSecret,
      };
      const { error } = await supabase
        .from('store_settings')
        .upsert({ key: 'mercado_pago', value }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store_settings'] });
      qc.invalidateQueries({ queryKey: ['store_settings_admin'] });
      toast.success('ConfiguraÃ§Ãµes do Mercado Pago salvas!');
    },
    onError: () => toast.error('Erro ao salvar configuraÃ§Ãµes.'),
  });

  // SuperFrete state
  const [sfEnabled, setSfEnabled] = useState(false);
  const [sfEnvironment, setSfEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [sfOriginZip, setSfOriginZip] = useState('');
  const [sfServices, setSfServices] = useState<string[]>(['PAC', 'SEDEX', 'Mini Envios']);

  useEffect(() => {
    if (settings?.superfrete) {
      const sf = settings.superfrete as SuperFreteSettings;
      setSfEnabled(sf.enabled ?? false);
      setSfEnvironment(sf.environment || 'sandbox');
      setSfOriginZip(sf.origin_zip || '');
      setSfServices(sf.services || ['PAC', 'SEDEX', 'Mini Envios']);
    }
  }, [settings]);

  const saveSf = useMutation({
    mutationFn: async () => {
      const value = {
        enabled: sfEnabled,
        environment: sfEnvironment,
        origin_zip: sfOriginZip,
        services: sfServices,
      };
      const { error } = await supabase
        .from('store_settings')
        .upsert({ key: 'superfrete', value }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store_settings'] });
      qc.invalidateQueries({ queryKey: ['store_settings_admin'] });
      toast.success('Configurações da SuperFrete salvas!');
    },
    onError: () => toast.error('Erro ao salvar configurações.'),
  });

  const toggleService = (service: string) => {
    setSfServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 font-body text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Integrações</h1>

      {/* Mercado Pago Card */}
      <div className="bg-card rounded-lg shadow-soft p-6 space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#009ee3]" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Mercado Pago</h2>
              <p className="font-body text-xs text-muted-foreground">Pagamentos via Pix, CartÃ£o e Boleto</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mpEnabled ? (
              <span className="flex items-center gap-1 text-xs font-body text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-body text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5" /> Inativo
              </span>
            )}
            <Switch checked={mpEnabled} onCheckedChange={setMpEnabled} />
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          {/* Environment */}
          <div>
            <label className="font-body text-sm font-medium text-foreground">Ambiente</label>
            <Select value={mpEnvironment} onValueChange={(v: 'sandbox' | 'production') => setMpEnvironment(v)}>
              <SelectTrigger className="mt-1 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">ðŸ§ª Sandbox (Testes)</SelectItem>
                <SelectItem value="production">ðŸš€ ProduÃ§Ã£o</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Public Key */}
          <div>
            <label className="font-body text-sm font-medium text-foreground">Public Key</label>
            <div className="relative mt-1">
              <Input
                type={showPublicKey ? 'text' : 'password'}
                value={mpPublicKey}
                onChange={e => setMpPublicKey(e.target.value)}
                placeholder="APP_USR-... ou TEST-..."
                className="font-body pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPublicKey(!showPublicKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPublicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="font-body text-xs text-muted-foreground mt-1">
              Usada no frontend para tokenizar cartÃµes (Checkout Transparente)
            </p>
          </div>

          {/* Access Token */}
          <div>
            <label className="font-body text-sm font-medium text-foreground">Access Token</label>
            <div className="relative mt-1">
              <Input
                type={showToken ? 'text' : 'password'}
                value={mpAccessToken}
                onChange={e => setMpAccessToken(e.target.value)}
                placeholder="APP_USR-... ou TEST-..."
                className="font-body pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="font-body text-xs text-muted-foreground mt-1">
              Usado no backend para processar pagamentos. Encontre em: Mercado Pago â†’ Credenciais
            </p>
          </div>

          {/* Payment methods */}
          <div>
            <label className="font-body text-sm font-medium text-foreground mb-2 block">MÃ©todos de Pagamento</label>
            <div className="space-y-3">
              <label className="flex items-center justify-between bg-muted/30 rounded-md px-4 py-3 cursor-pointer">
                <span className="font-body text-sm text-foreground">Pix</span>
                <Switch checked={mpPixEnabled} onCheckedChange={setMpPixEnabled} />
              </label>
              <label className="flex items-center justify-between bg-muted/30 rounded-md px-4 py-3 cursor-pointer">
                <span className="font-body text-sm text-foreground">CartÃ£o de CrÃ©dito</span>
                <Switch checked={mpCardEnabled} onCheckedChange={setMpCardEnabled} />
              </label>
              <label className="flex items-center justify-between bg-muted/30 rounded-md px-4 py-3 cursor-pointer">
                <span className="font-body text-sm text-foreground">Boleto BancÃ¡rio</span>
                <Switch checked={mpBoletoEnabled} onCheckedChange={setMpBoletoEnabled} />
              </label>
            </div>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="font-body text-sm font-medium text-foreground">Webhook Secret</label>
            <div className="relative mt-1">
              <Input
                type={showWebhookSecret ? 'text' : 'password'}
                value={mpWebhookSecret}
                onChange={e => setMpWebhookSecret(e.target.value)}
                placeholder="Cole aqui o secret do webhook"
                className="font-body pr-10"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="font-body text-xs text-muted-foreground mt-1">
              Configure este secret no painel do Mercado Pago em Webhooks â†’ Assinatura secreta. Ele Ã© usado para validar que as notificaÃ§Ãµes realmente vieram do Mercado Pago.
            </p>
          </div>

          {/* Max installments */}
          {mpCardEnabled && (
            <div>
              <label className="font-body text-sm font-medium text-foreground">MÃ¡ximo de Parcelas</label>
              <Select value={mpMaxInstallments} onValueChange={setMpMaxInstallments}>
                <SelectTrigger className="mt-1 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n}x {n === 1 ? '(Ã  vista)' : n <= 6 ? '(2.99% a.m.)' : '(3.49% a.m.)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Button onClick={() => saveMp.mutate()} disabled={saveMp.isPending} className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" /> Salvar Configurações
        </Button>
      </div>

      {/* SuperFrete Card */}
      <div className="bg-card rounded-lg shadow-soft p-6 space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">SuperFrete</h2>
              <p className="font-body text-xs text-muted-foreground">Cotação de frete em tempo real (PAC, Sedex, Mini Envios)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sfEnabled ? (
              <span className="flex items-center gap-1 text-xs font-body text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-body text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5" /> Inativo
              </span>
            )}
            <Switch checked={sfEnabled} onCheckedChange={setSfEnabled} />
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          {/* Environment */}
          <div>
            <label className="font-body text-sm font-medium text-foreground">Ambiente</label>
            <Select value={sfEnvironment} onValueChange={(v: 'sandbox' | 'production') => setSfEnvironment(v)}>
              <SelectTrigger className="mt-1 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">🧪 Sandbox (Testes)</SelectItem>
                <SelectItem value="production">🚀 Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Origin ZIP */}
          <div>
            <label className="font-body text-sm font-medium text-foreground">CEP de Origem</label>
            <Input
              value={sfOriginZip}
              onChange={e => setSfOriginZip(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="00000000"
              className="font-body mt-1 max-w-xs"
            />
            <p className="font-body text-xs text-muted-foreground mt-1">
              CEP de onde os produtos são enviados (sem traço)
            </p>
          </div>

          {/* Services */}
          <div>
            <label className="font-body text-sm font-medium text-foreground mb-2 block">Serviços Habilitados</label>
            <div className="space-y-3">
              {['PAC', 'SEDEX', 'Mini Envios'].map(service => (
                <label key={service} className="flex items-center justify-between bg-muted/30 rounded-md px-4 py-3 cursor-pointer">
                  <span className="font-body text-sm text-foreground">{service}</span>
                  <Switch checked={sfServices.includes(service)} onCheckedChange={() => toggleService(service)} />
                </label>
              ))}
            </div>
          </div>

          <p className="font-body text-xs text-muted-foreground">
            O token de API da SuperFrete é armazenado como secret seguro no servidor. Para alterar, entre em contato com o suporte.
          </p>
        </div>

        <Button onClick={() => saveSf.mutate()} disabled={saveSf.isPending} className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" /> Salvar Configurações
        </Button>
      </div>
    </div>
  );
};

export default AdminIntegrations;

