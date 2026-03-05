import { useEffect, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

const AdminLayout = () => {
  const { user, loading, isStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/admin/login');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && !isStaff) {
      navigate('/admin/login');
    }
  }, [loading, user, isStaff, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isStaff) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card">
            <SidebarTrigger className="mr-4" />
            <h1 className="font-body text-sm font-medium text-foreground">Painel Administrativo</h1>
          </header>
          <main className="flex-1 p-6 bg-muted/30 overflow-auto">
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
