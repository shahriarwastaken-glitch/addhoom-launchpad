import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import ProblemSection from '@/components/landing/ProblemSection';
import FeatureBento from '@/components/landing/FeatureBento';
import BeforeAfter from '@/components/landing/BeforeAfter';
import IntegrationsMarquee from '@/components/landing/IntegrationsMarquee';
import Testimonials from '@/components/landing/Testimonials';
import Pricing from '@/components/landing/Pricing';
import ROICalculator from '@/components/landing/ROICalculator';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <ProblemSection />
      <FeatureBento />
      <BeforeAfter />
      <IntegrationsMarquee />
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
