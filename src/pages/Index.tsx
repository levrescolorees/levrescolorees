import Header from '@/components/Header';
import HeroBanner from '@/components/HeroBanner';
import FeaturedProducts from '@/components/FeaturedProducts';
import SmartPricingSection from '@/components/SmartPricingSection';
import BenefitsSection from '@/components/BenefitsSection';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useLazySection } from '@/hooks/useLazySection';
import { lazy, Suspense } from 'react';

const CollectionsSection = lazy(() => import('@/components/CollectionsSection'));
const TestimonialsSection = lazy(() => import('@/components/TestimonialsSection'));
const FinalCTA = lazy(() => import('@/components/FinalCTA'));

const LazySection = ({ children }: { children: React.ReactNode }) => {
  const { ref, isVisible } = useLazySection('200px');
  return (
    <div ref={ref} className="min-h-[100px]">
      {isVisible && <Suspense fallback={null}>{children}</Suspense>}
    </div>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroBanner />
        <BenefitsSection />
        <FeaturedProducts />
        <SmartPricingSection />
        <LazySection><CollectionsSection /></LazySection>
        <LazySection><TestimonialsSection /></LazySection>
        <LazySection><FinalCTA /></LazySection>
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
};

export default Index;
