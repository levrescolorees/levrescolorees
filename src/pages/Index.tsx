import Header from '@/components/Header';
import HeroBanner from '@/components/HeroBanner';
import FeaturedProducts from '@/components/FeaturedProducts';
import SmartPricingSection from '@/components/SmartPricingSection';
import CollectionsSection from '@/components/CollectionsSection';
import BenefitsSection from '@/components/BenefitsSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import FinalCTA from '@/components/FinalCTA';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroBanner />
        <BenefitsSection />
        <FeaturedProducts />
        <SmartPricingSection />
        <CollectionsSection />
        <TestimonialsSection />
        <FinalCTA />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
};

export default Index;
