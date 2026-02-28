import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/hooks/useAuth";
import ThemeProvider from "@/components/ThemeProvider";
import { Loader2 } from 'lucide-react';

// Lazy-loaded storefront routes
const Index = lazy(() => import("./pages/Index"));
const Collections = lazy(() => import("./pages/Collections"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Atacado = lazy(() => import("./pages/Atacado"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy-loaded admin routes
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Products = lazy(() => import("./pages/admin/Products"));
const ProductForm = lazy(() => import("./pages/admin/ProductForm"));
const AdminCollections = lazy(() => import("./pages/admin/AdminCollections"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const OrderDetail = lazy(() => import("./pages/admin/OrderDetail"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminMedia = lazy(() => import("./pages/admin/AdminMedia"));
const AdminIntegrations = lazy(() => import("./pages/admin/AdminIntegrations"));
const AdminThemeEditor = lazy(() => import("./pages/admin/AdminThemeEditor"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Storefront */}
                <Route path="/" element={<Index />} />
                <Route path="/colecoes" element={<Collections />} />
                <Route path="/produto/:slug" element={<ProductDetail />} />
                <Route path="/carrinho" element={<Cart />} />
                <Route path="/atacado" element={<Atacado />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/rastreio" element={<OrderTracking />} />

                {/* Admin */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="produtos" element={<Products />} />
                  <Route path="produtos/:id" element={<ProductForm />} />
                  <Route path="colecoes" element={<AdminCollections />} />
                  <Route path="pedidos" element={<AdminOrders />} />
                  <Route path="pedidos/:id" element={<OrderDetail />} />
                  <Route path="clientes" element={<AdminCustomers />} />
                  <Route path="cupons" element={<AdminCoupons />} />
                  <Route path="midia" element={<AdminMedia />} />
                  <Route path="integracoes" element={<AdminIntegrations />} />
                  <Route path="configuracoes" element={<AdminSettings />} />
                  <Route path="theme-editor" element={<AdminThemeEditor />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </CartProvider>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
