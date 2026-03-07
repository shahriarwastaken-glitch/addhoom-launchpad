import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: { bn: 'বিনামূল্যে', en: 'Free' },
    price: { monthly: '০', annual: '০' },
    badge: null,
    highlight: false,
    features: [
      { bn: '৫টি AI বিজ্ঞাপন/দিন', en: '5 AI ads/day' },
      { bn: 'ধুম স্কোর (৩টি/দিন)', en: 'Dhoom Score (3/day)' },
      { bn: 'লিংক থেকে বিজ্ঞাপন (১টি/দিন)', en: 'Link to Ad (1/day)' },
      { bn: '১টি শপ ওয়ার্কস্পেস', en: '1 Shop Workspace' },
      { bn: 'Basic analytics', en: 'Basic analytics' },
    ],
    cta: { bn: 'শুরু করুন', en: 'Get Started' },
    ctaStyle: 'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground',
  },
  {
    name: { bn: 'Pro', en: 'Pro' },
    price: { monthly: '২,৯৯৯', annual: '২,৩৯৯' },
    badge: { bn: 'সবচেয়ে জনপ্রিয়', en: 'Most Popular' },
    highlight: true,
    features: [
      { bn: 'Unlimited AI বিজ্ঞাপন', en: 'Unlimited AI Ads' },
      { bn: 'AI ভিডিও বিজ্ঞাপন (৩০টি/মাস)', en: 'AI Video Ads (30/mo)' },
      { bn: 'Unlimited ধুম স্কোর', en: 'Unlimited Dhoom Score' },
      { bn: 'শপ DNA সেটআপ', en: 'Shop DNA Setup' },
      { bn: 'কনটেন্ট ক্যালেন্ডার (৩ মাস)', en: 'Content Calendar (3mo)' },
      { bn: 'প্রতিযোগী গোয়েন্দা', en: 'Competitor Intel' },
      { bn: 'অ্যাকাউন্ট ডাক্তার (সাপ্তাহিক)', en: 'Account Doctor (weekly)' },
      { bn: 'সব উৎসব টেমপ্লেট', en: 'All Festival Templates' },
      { bn: '৫টি ওয়ার্কস্পেস', en: '5 Workspaces' },
    ],
    cta: { bn: 'Pro তে যান', en: 'Go Pro' },
    ctaStyle: 'bg-gradient-cta text-primary-foreground shadow-orange-glow',
  },
  {
    name: { bn: 'Agency', en: 'Agency' },
    price: { monthly: '৭,৯৯৯', annual: '৬,৩৯৯' },
    badge: null,
    highlight: false,
    features: [
      { bn: 'সব Pro ফিচার', en: 'All Pro Features' },
      { bn: 'AI ভিডিও (Unlimited)', en: 'AI Video (Unlimited)' },
      { bn: '২০টি ওয়ার্কস্পেস', en: '20 Workspaces' },
      { bn: 'White label dashboard', en: 'White label dashboard' },
      { bn: 'ক্লায়েন্ট রিপোর্ট শেয়ার', en: 'Client Report Sharing' },
      { bn: 'অ্যাকাউন্ট ডাক্তার (দৈনিক)', en: 'Account Doctor (daily)' },
      { bn: 'Dedicated support', en: 'Dedicated support' },
    ],
    cta: { bn: 'Agency শুরু করুন', en: 'Start Agency' },
    ctaStyle: 'bg-foreground text-background hover:bg-foreground/90',
  },
];

const Pricing = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();
  const [annual, setAnnual] = useState(false);

  return (
    <section ref={ref} id="pricing" className="py-24 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <span className="section-label">{t('মূল্য', 'Pricing')}</span>
          <h2 className="mt-3 font-heading-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}>
            {t('সহজ মূল্য। লুকানো চার্জ নেই।', 'Simple Pricing. No Hidden Charges.')}
          </h2>
        </div>
        <div className="flex items-center justify-center gap-3 mb-12">
          <button onClick={() => setAnnual(false)} className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors ${!annual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
            {t('মাসিক', 'Monthly')}
          </button>
          <button onClick={() => setAnnual(true)} className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors flex items-center gap-2 ${annual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
            {t('বার্ষিক', 'Annual')}
            <span className="bg-brand-yellow text-foreground text-xs font-bold rounded-full px-2 py-0.5">{t('২০% ছাড়', '20% off')}</span>
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div key={i} className={`relative bg-card rounded-3xl p-8 shadow-warm transition-all duration-700 ${plan.highlight ? 'border-2 border-primary shadow-[0_0_40px_rgba(255,81,0,0.1)]' : 'border border-border'} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: `${i * 0.12}s` }}>
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold rounded-full px-4 py-1">
                  {t(plan.badge.bn, plan.badge.en)}
                </span>
              )}
              <h3 className="text-xl font-heading-en font-bold text-foreground mb-2">{t(plan.name.bn, plan.name.en)}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-mono font-bold text-foreground">৳{annual ? plan.price.annual : plan.price.monthly}</span>
                {plan.price.monthly !== '০' && <span className="text-muted-foreground text-sm font-body-bn">/{t('মাস', 'mo')}</span>}
              </div>
              <div className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <Check size={16} className="text-brand-green mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground font-body-bn">{t(f.bn, f.en)}</span>
                  </div>
                ))}
              </div>
              <Link to="/dashboard" className={`block text-center rounded-full py-3 text-sm font-semibold transition-all ${plan.ctaStyle}`}>
                {t(plan.cta.bn, plan.cta.en)}
              </Link>
              {plan.price.monthly !== '০' && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  {['bKash', 'Nagad', 'Visa'].map(p => (
                    <span key={p} className="text-xs text-muted-foreground bg-secondary rounded px-2 py-0.5">{p}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
