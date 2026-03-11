import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingHero from '@/components/landing/LandingHero';
import SocialProofBar from '@/components/landing/SocialProofBar';
import FeaturesShowcase from '@/components/landing/FeaturesShowcase';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingPricing from '@/components/landing/LandingPricing';
import LandingFAQ from '@/components/landing/LandingFAQ';
import LandingFinalCTA from '@/components/landing/LandingFinalCTA';
import LandingFooter from '@/components/landing/LandingFooter';

const Index = () => {
  return (
    <div className="min-h-screen scroll-smooth">
      <div className="grain-overlay" />
      <LandingNavbar />
      <LandingHero />
      <SocialProofBar />
      <FeaturesShowcase />
      <LandingHowItWorks />
      <LandingPricing />
      <LandingFAQ />
      <LandingFinalCTA />
      <LandingFooter />
    </div>
  );
};

export default Index;
