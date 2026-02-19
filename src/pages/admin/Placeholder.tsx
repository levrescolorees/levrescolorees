import { useLocation } from 'react-router-dom';

const Placeholder = () => {
  const { pathname } = useLocation();
  const section = pathname.split('/').pop() || '';
  const names: Record<string, string> = {
    colecoes: 'Coleções', pedidos: 'Pedidos', clientes: 'Clientes',
    cupons: 'Cupons', midia: 'Mídia', configuracoes: 'Configurações',
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">{names[section] || section}</h1>
      <p className="font-body text-sm text-muted-foreground">Esta seção será implementada nas próximas fases.</p>
    </div>
  );
};

export default Placeholder;
