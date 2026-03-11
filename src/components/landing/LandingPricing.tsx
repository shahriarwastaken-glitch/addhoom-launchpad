import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MessageCircle, ChevronDown } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const LandingPricing = () => {
  const { ref, isVisible } = useScrollReveal();
  const isBD = typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Dhaka';
  const [currency, setCurrency] = useState<'intl' | 'bd'>(isBD ? 'bd' : 'intl');
  const [creditsOpen, setCreditsOpen] = useState(false);

  const plans = [
    {
      name: 'Starter', desc: 'Perfect for getting started',
      priceIntl: '$19', priceBD: '৳799', credits: '5,000',
      usage: '~40 images · ~15 videos · ~500 ad copies',
      features: ['All core features', '1 workspace', 'Email support', 'Dhoom Score — always free'],
      highlighted: false,
    },
    {
      name: 'Pro', desc: 'For growing businesses', badge: 'Most Popular',
      priceIntl: '$49', priceBD: '৳1,999', credits: '15,000',
      usage: '~120 images · ~45 videos · ~1,500 ad copies',
      features: ['Everything in Starter', 'Virtual Try-On', '5 workspaces', 'Content Calendar', 'Priority support'],
      highlighted: true,
    },
    {
      name: 'Agency', desc: 'For teams and agencies',
      priceIntl: '$99', priceBD: '৳4,999', credits: '35,000',
      usage: '~280 images · ~106 videos · ~3,500 ad copies',
      features: ['Everything in Pro', '20 workspaces', 'White label', 'Dedicated support', 'Priority processing'],
      highlighted: false,
    },
  ];

  const creditCosts = [
    { action: 'Image Generation', credits: '125' },
    { action: 'Video Generation (5s)', credits: '330' },
    { action: 'Virtual Try-On', credits: '125' },
    { action: 'Image Upscale', credits: '100' },
    { action: 'Content Calendar', credits: '500' },
    { action: 'Ad Copy', credits: '10' },
    { action: 'Prompt Enhancement', credits: '10' },
    { action: 'Account Doctor', credits: '50' },
    { action: 'Dhoom Score', credits: 'Free', free: true },
    { action: 'Schedule to Calendar', credits: 'Free', free: true },
  ];

  return (
    <section id="pricing" ref={ref} className="py-[120px] px-6 bg-card">
      <div className="max-w-[1100px] mx-auto">
        <div className={`text-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <span className="font-mono text-xs tracking-[0.1em] text-primary uppercase">Simple pricing</span>
          <h2 className="mt-4 font-heading-en font-[800] text-foreground" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>Choose your plan.</h2>
          <p className="mt-3 font-body-en text-lg text-muted-foreground">Explore free. Subscribe when you're ready to start creating.</p>

          {/* Currency toggle */}
          <div className="mt-8 inline-flex items-center rounded-full p-1" style={{ background: '#F0EDE8' }}>
            <button onClick={() => setCurrency('intl')} className={`flex items-center gap-1.5 font-body-en text-sm font-medium rounded-full px-5 py-2 transition-all ${currency === 'intl' ? 'bg-card shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-foreground' : 'text-muted-foreground'}`}>
              International
            </button>
            <button onClick={() => setCurrency('bd')} className={`flex items-center gap-1.5 font-body-en text-sm font-medium rounded-full px-5 py-2 transition-all ${currency === 'bd' ? 'bg-card shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-foreground' : 'text-muted-foreground'}`}>
              Bangladesh
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative rounded-[20px] p-8 transition-all duration-700 hover:-translate-y-1 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} ${plan.highlighted ? 'border-2 border-primary shadow-[0_8px_40px_rgba(255,81,0,0.12)] lg:-translate-y-2 bg-card' : 'border-[1.5px] border-border bg-card'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {plan.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground font-mono text-[11px] font-medium rounded-full px-4 py-1">{plan.badge}</span>
              )}
              <h3 className="font-heading-en text-xl font-bold text-foreground">{plan.name}</h3>
              <p className="font-body-en text-sm text-muted-foreground mt-1">{plan.desc}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-heading-en font-[800] text-foreground" style={{ fontSize: '48px' }}>{currency === 'intl' ? plan.priceIntl : plan.priceBD}</span>
                <span className="font-body-en text-base text-muted-foreground">/month</span>
              </div>
              <span className="inline-block mt-3 font-mono text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1">{plan.credits} credits/month</span>
              <p className="font-body-en text-[13px] text-muted-foreground mt-2">{plan.usage}</p>
              <div className="h-px bg-border my-5" />
              <ul className="space-y-2.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 font-body-en text-sm text-foreground">
                    <Check size={15} className="text-brand-green shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className={`mt-6 block w-full text-center font-body-en text-sm font-semibold rounded-xl py-3.5 transition-all duration-200 ${plan.highlighted ? 'bg-primary text-primary-foreground hover:opacity-90' : 'border border-border text-foreground hover:border-primary hover:text-primary'}`}
              >
                Get Started →
              </Link>
            </div>
          ))}

          {/* Custom card */}
          <div className={`rounded-[20px] p-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`} style={{ background: '#1C1B1A', transitionDelay: '300ms' }}>
            <h3 className="font-heading-en text-xl font-bold text-white">Custom</h3>
            <p className="font-body-en text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>For large teams and enterprises</p>
            <p className="font-heading-en font-bold text-white mt-6" style={{ fontSize: '32px', lineHeight: 1.2 }}>Need more?<br />Let's talk.</p>
            <a
              href="https://wa.me/880XXXXXXXXXX"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 w-full flex items-center justify-center gap-2 font-body-en text-sm font-semibold text-white rounded-xl py-3.5 transition-all hover:opacity-90"
              style={{ background: '#25D366' }}
            >
              <MessageCircle size={16} /> WhatsApp Us
            </a>
          </div>
        </div>


        {/* Credit costs collapsible */}
        <Collapsible open={creditsOpen} onOpenChange={setCreditsOpen} className="mt-8 max-w-[600px] mx-auto">
          <CollapsibleTrigger className="flex items-center gap-1.5 mx-auto font-body-en text-[13px] text-muted-foreground hover:text-primary transition-colors cursor-pointer">
            What does each credit cost? <ChevronDown size={14} className={`transition-transform duration-200 ${creditsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="bg-secondary rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-body-en font-semibold text-foreground px-4 py-3">Action</th>
                    <th className="text-right font-body-en font-semibold text-foreground px-4 py-3">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {creditCosts.map(c => (
                    <tr key={c.action} className="border-b border-border last:border-0">
                      <td className="font-body-en text-sm text-foreground px-4 py-2.5">{c.action}</td>
                      <td className={`text-right font-mono text-sm px-4 py-2.5 ${c.free ? 'text-brand-green font-semibold' : 'text-muted-foreground'}`}>
                        {c.credits}{c.free && ' ✓'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-center font-body-en text-xs text-muted-foreground">
              Credits reset on the 1st of every month. Unused credits do not roll over.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
};

export default LandingPricing;
