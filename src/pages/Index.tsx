import { Helmet } from 'react-helmet-async';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingHero from '@/components/landing/LandingHero';
import SocialProofBar from '@/components/landing/SocialProofBar';
import FeaturesShowcase from '@/components/landing/FeaturesShowcase';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingPricing from '@/components/landing/LandingPricing';
import LandingFAQ from '@/components/landing/LandingFAQ';
import LandingFinalCTA from '@/components/landing/LandingFinalCTA';
import LandingFooter from '@/components/landing/LandingFooter';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AdDhoom Studio',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'AI-powered ad creation studio. Generate studio-quality product images, scroll-stopping ad copy, and cinematic video ads from one platform.',
  url: 'https://addhoom.lovable.app',
  image: 'https://addhoom.lovable.app/og-image.png',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BDT',
    description: 'Free plan available',
  },
};

const Index = () => {
  return (
    <div className="min-h-screen scroll-smooth">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
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
