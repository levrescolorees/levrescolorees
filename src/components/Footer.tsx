import { Link } from 'react-router-dom';
import { Instagram, Mail } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';
import { useStoreSettings } from '@/hooks/useStoreSettings';

const Footer = () => {
  const { data: settings } = useStoreSettings();
  const brandName = settings?.brand?.name || 'Lèvres Colorées';
  const tagline = settings?.brand?.tagline || 'Cores que expressam. Qualidade que conquista. Do varejo ao atacado.';

  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-logo text-2xl font-light italic tracking-[0.05em] text-rose-light mb-4">{brandName}</h3>
            <p className="text-sm text-background/60 font-body leading-relaxed">{tagline}</p>
          </div>
          <div>
            <h4 className="font-body text-sm font-semibold tracking-[0.2em] uppercase mb-4 text-rose-gold">Loja</h4>
            <div className="flex flex-col gap-2">
              <Link to="/colecoes" className="text-sm font-body text-background/60 hover:text-background transition-colors">Todas as Coleções</Link>
              <Link to="/colecoes?filter=bestsellers" className="text-sm font-body text-background/60 hover:text-background transition-colors">Mais Vendidos</Link>
              <Link to="/colecoes?filter=novidades" className="text-sm font-body text-background/60 hover:text-background transition-colors">Novidades</Link>
            </div>
          </div>
          <div>
            <h4 className="font-body text-sm font-semibold tracking-[0.2em] uppercase mb-4 text-rose-gold">Atacado</h4>
            <div className="flex flex-col gap-2">
              <Link to="/atacado" className="text-sm font-body text-background/60 hover:text-background transition-colors">Box 06</Link>
              <Link to="/atacado" className="text-sm font-body text-background/60 hover:text-background transition-colors">Box 12</Link>
              <Link to="/atacado" className="text-sm font-body text-background/60 hover:text-background transition-colors">Programa Revenda</Link>
            </div>
          </div>
          <div>
            <h4 className="font-body text-sm font-semibold tracking-[0.2em] uppercase mb-4 text-rose-gold">Contato</h4>
            <div className="flex flex-col gap-2">
              <a href="mailto:contato@levrescolorees.com" className="text-sm font-body text-background/60 hover:text-background transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4" /> contato@levrescolorees.com
              </a>
              <a href="https://instagram.com/levrescolorees" target="_blank" rel="noopener noreferrer" className="text-sm font-body text-background/60 hover:text-background transition-colors flex items-center gap-2">
                <Instagram className="w-4 h-4" /> @levrescolorees
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-background/10 pt-6 text-center">
          <p className="text-xs font-body text-background/40">© {new Date().getFullYear()} {brandName}. Todos os direitos reservados. · v{APP_VERSION}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
