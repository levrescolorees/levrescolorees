import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, MessageCircle, Instagram, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAdminStoreSettings } from '@/hooks/useStoreSettings';
import logoMercadoPago from '@/assets/logo-mercadopago.png';
import logoSuperFrete from '@/assets/logo-superfrete.png';

interface IntegrationCard {
  slug: string;
  name: string;
  description: string;
  logo: string | null;
  icon?: React.ReactNode;
  category: string;
  settingsKey?: string;
  enabledField?: string;
  comingSoon?: boolean;
}

const integrations: IntegrationCard[] = [
  {
    slug: 'mercado-pago',
    name: 'Mercado Pago',
    description: 'Pagamentos via Pix, Cartão de Crédito e Boleto Bancário',
    logo: logoMercadoPago,
    category: 'Pagamentos',
    settingsKey: 'mercado_pago',
    enabledField: 'enabled',
  },
  {
    slug: 'superfrete',
    name: 'SuperFrete',
    description: 'Cotação de frete em tempo real com PAC, Sedex e Mini Envios',
    logo: logoSuperFrete,
    category: 'Frete',
    settingsKey: 'superfrete',
    enabledField: 'enabled',
  },
  {
    slug: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Notificações de pedidos e atendimento automatizado',
    logo: null,
    icon: <MessageCircle className="w-8 h-8 text-green-500" />,
    category: 'Comunicação',
    comingSoon: true,
  },
  {
    slug: 'instagram',
    name: 'Instagram Shopping',
    description: 'Sincronize seu catálogo e venda pelo Instagram',
    logo: null,
    icon: <Instagram className="w-8 h-8 text-pink-500" />,
    category: 'Vendas',
    comingSoon: true,
  },
  {
    slug: 'shopify',
    name: 'Shopify',
    description: 'Importe produtos e pedidos do Shopify',
    logo: null,
    icon: <ShoppingBag className="w-8 h-8 text-emerald-600" />,
    category: 'Vendas',
    comingSoon: true,
  },
];

const AdminIntegrations = () => {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useAdminStoreSettings();

  const isInstalled = (card: IntegrationCard): boolean => {
    if (!card.settingsKey || !settings) return false;
    const s = settings[card.settingsKey] as any;
    return s?.[card.enabledField || 'enabled'] === true;
  };

  const categories = [...new Set(integrations.map(i => i.category))];

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 font-body text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Integrações</h1>
        <p className="font-body text-sm text-muted-foreground mt-1">
          Conecte serviços externos para expandir as funcionalidades da sua loja
        </p>
      </div>

      {categories.map(category => {
        const items = integrations.filter(i => i.category === category);
        return (
          <div key={category}>
            <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(card => {
                const installed = isInstalled(card);
                const disabled = card.comingSoon;

                return (
                  <button
                    key={card.slug}
                    onClick={() => !disabled && navigate(`/admin/integracoes/${card.slug}`)}
                    disabled={disabled}
                    className={`
                      group relative bg-card rounded-xl border border-border p-6 text-left transition-all duration-200
                      ${disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:shadow-md hover:border-primary/40 cursor-pointer'
                      }
                    `}
                  >
                    {/* Status badge */}
                    <div className="absolute top-4 right-4">
                      {card.comingSoon ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Clock className="w-3 h-3" /> Em breve
                        </Badge>
                      ) : installed ? (
                        <Badge className="text-xs gap-1 bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                          <CheckCircle2 className="w-3 h-3" /> Instalado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Disponível
                        </Badge>
                      )}
                    </div>

                    {/* Logo */}
                    <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mb-4 overflow-hidden">
                      {card.logo ? (
                        <img src={card.logo} alt={card.name} className="w-12 h-12 object-contain" />
                      ) : (
                        card.icon
                      )}
                    </div>

                    {/* Text */}
                    <h3 className="font-display text-base font-semibold text-foreground mb-1">
                      {card.name}
                    </h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">
                      {card.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminIntegrations;
