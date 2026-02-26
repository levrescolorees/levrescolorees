import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Menu, X, Search } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useTheme } from '@/components/ThemeProvider';

const Header = () => {
  const { totalItems, setIsCartOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data: settings } = useStoreSettings();
  const { theme: activeTheme } = useTheme();

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/colecoes?search=${encodeURIComponent(q)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const brandName = settings?.brand?.name || 'Lèvres Colorées';
  const logoUrl = activeTheme?.components?.images?.logo || '';
  const topBarVisible = activeTheme?.components?.topBar?.visible ?? true;
  const topBarText = activeTheme?.components?.topBar?.text || 'FRETE GRÁTIS acima de R$299 • Compre no Atacado e economize até 40%';

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/colecoes', label: 'Coleções' },
    { to: '/colecoes?filter=bestsellers', label: 'Mais Vendidos' },
    { to: '/colecoes?filter=novidades', label: 'Novidades' },
    { to: '/atacado', label: 'Atacado' },
  ];

  return (
    <>
      {/* Top bar */}
      {topBarVisible && (
        <div className="bg-primary text-primary-foreground text-center py-2 text-xs font-body tracking-wider">
          {topBarText}
        </div>
      )}

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 flex items-center justify-between h-16 md:h-20">
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 text-foreground">
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-8 md:h-10 w-auto object-contain" />
            ) : (
              <span className="font-display text-xl md:text-2xl font-semibold tracking-wide text-foreground">
                {brandName}
              </span>
            )}
          </Link>

          <AnimatePresence mode="wait">
            {searchOpen ? (
              <motion.form
                key="search"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                onSubmit={handleSearch}
                className="flex items-center gap-2"
              >
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && closeSearch()}
                  placeholder="Buscar produtos..."
                  className="w-48 lg:w-64 px-3 py-1.5 text-sm font-body border border-border rounded-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button type="button" onClick={closeSearch} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </motion.form>
            ) : (
              <motion.nav key="nav" className="hidden md:flex items-center gap-8">
                {navLinks.map(link => (
                  <Link
                    key={link.to + link.label}
                    to={link.to}
                    className="text-sm font-body font-medium text-muted-foreground hover:text-primary transition-colors tracking-wide"
                  >
                    {link.label}
                  </Link>
                ))}
              </motion.nav>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(o => !o)} className="p-2 text-foreground hover:text-primary transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-foreground hover:text-primary transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {totalItems}
                </motion.span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-foreground/40 z-50"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-background z-50 p-6"
            >
              <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-foreground">
                <X className="w-5 h-5" />
              </button>
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} className="h-8 w-auto object-contain mb-8" />
              ) : (
                <div className="font-display text-xl font-semibold mb-8 text-foreground">{brandName}</div>
              )}
              <nav className="flex flex-col gap-4">
                {navLinks.map(link => (
                  <Link
                    key={link.to + link.label}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="text-base font-body text-foreground hover:text-primary transition-colors py-2 border-b border-border"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
