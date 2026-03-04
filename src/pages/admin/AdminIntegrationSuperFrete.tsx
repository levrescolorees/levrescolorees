import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAdminStoreSettings } from '@/hooks/useStoreSettings';
import logoSuperFrete from '@/assets/logo-superfrete.png';

interface SuperFreteSettings {
  enabled?: boolean;
  environment?: 'sandbox' | 'production';
  origin_zip?: string;
  services?: string[];
}

const AdminIntegrationSuperFrete = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: settings, isLoading } = useAdminStoreSettings();

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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/integracoes')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <img src={logoSuperFrete} alt="SuperFrete" className="w-10 h-10 rounded-lg object-contain" />
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">SuperFrete</h1>
          <p className="font-body text-sm text-muted-foreground">Cotação de frete em tempo real (PAC, Sedex, Mini Envios)</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
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

      {/* Form */}
      <div className="bg-card rounded-lg shadow-soft p-6 space-y-6 max-w-2xl">
        <div className="space-y-4">
          {/* Environment */}
          <div>
            <label className="font-body text-sm font-medium text-foreground">Ambiente</label>
            <Select value={sfEnvironment} onValueChange={(v: 'sandbox' | 'production') => setSfEnvironment(v)}>
              <SelectTrigger className="mt-1 max-w-xs"><SelectValue /></SelectTrigger>
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
            <p className="font-body text-xs text-muted-foreground mt-1">CEP de onde os produtos são enviados (sem traço)</p>
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

export default AdminIntegrationSuperFrete;
