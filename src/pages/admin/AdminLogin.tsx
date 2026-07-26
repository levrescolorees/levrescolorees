import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, AlertCircle, Eye, EyeOff, Sparkles, ShieldCheck, Palette } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const LipIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 19C12 19 2 14 2 8C2 5 4 2 7 2C9 2 11 3.5 12 5C13 3.5 15 2 17 2C20 2 22 5 22 8C22 14 12 19 12 19Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M4 10C7 11 10 11 12 10C14 11 17 11 20 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

const features = [
  {
    icon: Palette,
    title: 'Editor de Tema',
    desc: 'Ajuste cores, tipografia e slides do hero em tempo real.',
  },
  {
    icon: Sparkles,
    title: 'Catálogo Premium',
    desc: 'Produtos com variações, swatches e curadoria por coleção.',
  },
  {
    icon: ShieldCheck,
    title: 'Pedidos Seguros',
    desc: 'Checkout com Mercado Pago e envio via SuperFrete integrados.',
  },
];

const AdminLogin = () => {
  const { signIn, user, isStaff, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user && isStaff) {
      navigate('/admin', { replace: true });
    }
  }, [authLoading, user, isStaff, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError('Email ou senha inválidos.');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left panel — brand */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[hsl(var(--charcoal))] text-primary-foreground p-12">
        {/* Decorative gradient orbs */}
        <div
          aria-hidden
          className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -right-20 w-[32rem] h-[32rem] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--rose-gold)) 0%, transparent 70%)' }}
        />
        {/* Subtle grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/90 text-primary-foreground">
            <LipIcon className="w-5 h-4" />
          </span>
          <span className="font-logo text-xl italic tracking-wide">Lèvres Colorées</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 space-y-8 max-w-md"
        >
          <div>
            <p className="text-xs font-body tracking-[0.3em] uppercase text-primary-foreground/60 mb-4">
              Painel Administrativo
            </p>
            <h1 className="font-display text-4xl xl:text-5xl leading-tight">
              Sua boutique digital,{' '}
              <span className="italic font-light text-[hsl(var(--rose-glow))]">gerenciada com elegância.</span>
            </h1>
          </div>

          <div className="space-y-5">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10">
                  <f.icon className="w-4 h-4 text-[hsl(var(--rose-glow))]" />
                </span>
                <div>
                  <p className="font-body font-medium text-sm text-primary-foreground">{f.title}</p>
                  <p className="font-body text-sm text-primary-foreground/60 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="relative z-10 font-body text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} Lèvres Colorées · Todos os direitos reservados
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center px-6 py-12 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground">
              <LipIcon className="w-5 h-4" />
            </span>
            <span className="font-logo text-lg italic text-primary">Lèvres Colorées</span>
          </div>

          <div>
            <h2 className="font-display text-3xl text-foreground">Bem-vinda de volta</h2>
            <p className="font-body text-sm text-muted-foreground mt-2">
              Acesse seu painel para gerenciar produtos, pedidos e o tema da loja.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm font-body px-3 py-2.5 rounded-md border border-destructive/20"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block font-body text-xs font-medium text-foreground tracking-wide">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                placeholder="voce@levrescolorees.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="font-body h-11 bg-muted/40 border-border focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block font-body text-xs font-medium text-foreground tracking-wide">
                  Senha
                </label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="font-body h-11 bg-muted/40 border-border pr-10 focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-body font-medium tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? 'Entrando...' : 'Entrar no painel'}
            </Button>
          </form>

          <p className="text-center font-body text-xs text-muted-foreground">
            Acesso restrito · Lèvres Colorées © {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;
