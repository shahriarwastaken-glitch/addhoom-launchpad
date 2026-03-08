import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import FeatureBento from '@/components/landing/FeatureBento';
import Pricing from '@/components/landing/Pricing';
import Testimonials from '@/components/landing/Testimonials';
import ROICalculator from '@/components/landing/ROICalculator';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';

const Index = () => {
  return (
    <div className="min-h-screen scroll-smooth">
      {/* Grain overlay */}
      <div className="grain-overlay" />
      <Navbar />
      <Hero />
      <HowItWorks />
      <FeatureBento />
      <Testimonials />
      <Pricing />
      <ROICalculator />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Index;
