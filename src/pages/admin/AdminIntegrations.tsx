import { useState, useEffect } from 'react';
import { Save, CreditCard, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useStoreSettings } from '@/hooks/useStoreSettings';

const AdminIntegrations = () => {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useStoreSettings();

  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpEnvironment, setMpEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [mpEnabled, setMpEnabled] = useState(false);
  const [mpPixEnabled, setMpPixEnabled] = useState(true);
  const [mpCardEnabled, setMpCardEnabled] = useState(true);
  const [mpBoletoEnabled, setMpBoletoEnabled] = useState(true);
  const [mpMaxInstallments, setMpMaxInstallments] = useState('12');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (settings?.mercado_pago) {
      const mp = settings.mercado_pago as any;
      setMpAccessToken(mp.access_token || '');
      setMpEnvironment(mp.environment || 'sandbox');
      setMpEnabled(mp.enabled ?? false);
      setMpPixEnabled(mp.pix_enabled ?? true);
      setMpCardEnabled(mp.card_enabled ?? true);
      setMpBoletoEnabled(mp.boleto_enabled ?? true);
      setMpMaxInstallments(String(mp.max_installments || 12));
    }
  }, [settings]);

  const saveMp = useMutation({
    mutationFn: async () => {
      const value = {
        access_token: mpAccessToken,
        environment: mpEnvironment,
        enabled: mpEnabled,
        pix_enabled: mpPixEnabled,
        card_enabled: mpCardEnabled,
        boleto_enabled: mpBoletoEnabled,
        max_installments: Number(mpMaxInstallments),
      };
      const { error } = await supabase
        .from('store_settings')
        .upsert({ key: 'mercado_pago', value }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store_settings'] });
      toast.success('Configurações do Mercado Pago salvas!');
    },
    onError: () => toast.error('Erro ao salvar configurações.'),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 font-body text-muted-foreground">Carregando...</div>;
  }

  const maskedToken = mpAccessToken
    ? mpAccessToken.slice(0, 12) + '••••••••' + mpAccessToken.slice(-4)
    : '';

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
              <p className="font-body text-xs text-muted-foreground">Pagamentos via Pix, Cartão e Boleto</p>
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
                <SelectItem value="sandbox">🧪 Sandbox (Testes)</SelectItem>
                <SelectItem value="production">🚀 Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Access Token */}
          <div>
            <label className="font-body text-sm font-medium text-foreground">Access Token</label>
            <div className="relative mt-1">
              <Input
                type={showToken ? 'text' : 'password'}
                value={mpAccessToken}
                onChange={e => setMpAccessToken(e.target.value)}
                placeholder="APP_USR-..."
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
              Encontre em: Mercado Pago → Seu negócio → Configurações → Credenciais
            </p>
          </div>

          {/* Payment methods */}
          <div>
            <label className="font-body text-sm font-medium text-foreground mb-2 block">Métodos de Pagamento</label>
            <div className="space-y-3">
              <label className="flex items-center justify-between bg-muted/30 rounded-md px-4 py-3 cursor-pointer">
                <span className="font-body text-sm text-foreground">Pix</span>
                <Switch checked={mpPixEnabled} onCheckedChange={setMpPixEnabled} />
              </label>
              <label className="flex items-center justify-between bg-muted/30 rounded-md px-4 py-3 cursor-pointer">
                <span className="font-body text-sm text-foreground">Cartão de Crédito</span>
                <Switch checked={mpCardEnabled} onCheckedChange={setMpCardEnabled} />
              </label>
              <label className="flex items-center justify-between bg-muted/30 rounded-md px-4 py-3 cursor-pointer">
                <span className="font-body text-sm text-foreground">Boleto Bancário</span>
                <Switch checked={mpBoletoEnabled} onCheckedChange={setMpBoletoEnabled} />
              </label>
            </div>
          </div>

          {/* Max installments */}
          {mpCardEnabled && (
            <div>
              <label className="font-body text-sm font-medium text-foreground">Máximo de Parcelas</label>
              <Select value={mpMaxInstallments} onValueChange={setMpMaxInstallments}>
                <SelectTrigger className="mt-1 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n}x {n === 1 ? '(à vista)' : n <= 6 ? '(2.99% a.m.)' : '(3.49% a.m.)'}
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
    </div>
  );
};

export default AdminIntegrations;
