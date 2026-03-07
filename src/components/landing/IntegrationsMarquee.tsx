import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const row1 = ['Facebook Ads', 'Google Ads', 'Instagram', 'Daraz', 'bKash', 'Nagad', 'Pathao', 'Shohoz'];
const row2 = ['Rocket', 'SSLCommerz', 'WhatsApp Business', 'Chaldal', 'WooCommerce', 'Shopify', 'Zapier', 'Shajgoj'];

const IntegrationsMarquee = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();

  return (
    <section ref={ref} className="py-24 px-4 overflow-hidden">
      <div className="container mx-auto max-w-5xl text-center mb-12">
        <h2 className="font-heading-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}>
          {t('আপনার সব প্ল্যাটফর্মের সাথে কানেক্টেড', 'Connected to All Your Platforms')}
        </h2>
      </div>
      <div className={`relative transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        <div className="flex gap-4 mb-4 animate-marquee-right w-max">
          {[...row1, ...row1].map((item, i) => (
            <span key={i} className="flex-shrink-0 bg-card rounded-full px-6 py-3 shadow-warm text-sm font-medium text-muted-foreground hover:text-foreground hover:scale-105 transition-all whitespace-nowrap">{item}</span>
          ))}
        </div>
        <div className="flex gap-4 animate-marquee-left w-max">
          {[...row2, ...row2].map((item, i) => (
            <span key={i} className="flex-shrink-0 bg-card rounded-full px-6 py-3 shadow-warm text-sm font-medium text-muted-foreground hover:text-foreground hover:scale-105 transition-all whitespace-nowrap">{item}</span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IntegrationsMarquee;
