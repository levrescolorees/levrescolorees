import { Link } from 'react-router-dom';
import { Instagram, Mail } from 'lucide-react';

const Footer = () => (
  <footer className="bg-charcoal text-primary-foreground py-12">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <h3 className="font-display text-xl font-semibold mb-4">Lèvres Colorées</h3>
          <p className="text-sm text-primary-foreground/60 font-body leading-relaxed">
            Cores que expressam. Qualidade que conquista. Do varejo ao atacado.
          </p>
        </div>
        <div>
          <h4 className="font-body text-sm font-semibold tracking-wider uppercase mb-4">Loja</h4>
          <div className="flex flex-col gap-2">
            <Link to="/colecoes" className="text-sm font-body text-primary-foreground/60 hover:text-primary-foreground transition-colors">Todas as Coleções</Link>
            <Link to="/colecoes?filter=bestsellers" className="text-sm font-body text-primary-foreground/60 hover:text-primary-foreground transition-colors">Mais Vendidos</Link>
            <Link to="/colecoes?filter=novidades" className="text-sm font-body text-primary-foreground/60 hover:text-primary-foreground transition-colors">Novidades</Link>
          </div>
        </div>
        <div>
          <h4 className="font-body text-sm font-semibold tracking-wider uppercase mb-4">Atacado</h4>
          <div className="flex flex-col gap-2">
            <Link to="/atacado" className="text-sm font-body text-primary-foreground/60 hover:text-primary-foreground transition-colors">Box 06</Link>
            <Link to="/atacado" className="text-sm font-body text-primary-foreground/60 hover:text-primary-foreground transition-colors">Box 12</Link>
            <Link to="/atacado" className="text-sm font-body text-primary-foreground/60 hover:text-primary-foreground transition-colors">Programa Revenda</Link>
          </div>
        </div>
        <div>
          <h4 className="font-body text-sm font-semibold tracking-wider uppercase mb-4">Contato</h4>
          <div className="flex flex-col gap-2">
            <a href="mailto:contato@levrescolorees.com" className="text-sm font-body text-primary-foreground/60 hover:text-primary-foreground transition-colors flex items-center gap-2">
              <Mail className="w-4 h-4" /> contato@levrescolorees.com
            </a>
            <a href="#" className="text-sm font-body text-primary-foreground/60 hover:text-primary-foreground transition-colors flex items-center gap-2">
              <Instagram className="w-4 h-4" /> @levrescolorees
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 pt-6 text-center">
        <p className="text-xs font-body text-primary-foreground/40">© 2025 Lèvres Colorées. Todos os direitos reservados.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
