import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Check } from 'lucide-react';

const Pricing = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();
  const [annual, setAnnual] = useState(false);

  const proFeatures = [t('সীমাহীন বিজ্ঞাপন কপি জেনারেশন','Unlimited ad copy'), t('ধুম স্কোর বিশ্লেষণ','Dhoom Score'), t('মাসে ২টি ভিডিও বিজ্ঞাপন','2 video ads/mo'), t('৯০ দিনের কনটেন্ট ক্যালেন্ডার','90-day calendar'), t('প্রতিযোগী বিশ্লেষণ','Competitor analysis'), t('AI চ্যাট বিশেষজ্ঞ','AI Chat'), t('৫টি ওয়ার্কস্পেস','5 workspaces'), t('বাংলা + ইংরেজি সাপোর্ট','Bengali + English')];
  const agencyFeatures = [t('সব Pro ফিচার +','All Pro features +'), t('সীমাহীন ওয়ার্কস্পেস (২০টি ক্লায়েন্ট)','Unlimited workspaces (20 clients)'), t('সীমাহীন ভিডিও বিজ্ঞাপন','Unlimited video ads'), t('হোয়াইট লেবেল রিপোর্ট','White label reports'), t('দলগত অ্যাক্সেস','Team access'), t('অগ্রাধিকার সাপোর্ট','Priority support'), t('কাস্টম ব্র্যান্ড ভয়েস','Custom brand voice')];

  return (
    <section id="pricing" ref={ref} className="py-24 px-6 bg-secondary">
      <div className="max-w-[1000px] mx-auto">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'}`}>
          <span className="landing-pill">{t('মূল্য পরিকল্পনা', 'Pricing')}</span>
          <h2 className="mt-3 font-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>{t('সহজ মূল্য। কোনো লুকানো চার্জ নেই।', 'Simple Pricing. No Hidden Charges.')}</h2>
          <p className="mt-3 font-bn text-lg text-muted-foreground">{t('bKash, Nagad, Rocket, কার্ড — সবভাবে পেমেন্ট করুন', 'bKash, Nagad, Rocket, Card — pay any way')}</p>
          <div className="mt-8 inline-flex items-center gap-3 bg-card rounded-full p-1 border border-border">
            <button onClick={() => setAnnual(false)} className={`font-bn text-sm font-semibold rounded-full px-5 py-2 transition-all ${!annual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('মাসিক', 'Monthly')}</button>
            <button onClick={() => setAnnual(true)} className={`font-bn text-sm font-semibold rounded-full px-5 py-2 transition-all flex items-center gap-2 ${annual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t('বার্ষিক', 'Annual')}<span className="text-[10px] font-bold bg-brand-green text-primary-foreground rounded-full px-2 py-0.5">{t('২০% সাশ্রয়', '20% off')}</span></button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-[800px] mx-auto items-start">
          <div className={`bg-card rounded-3xl border border-border p-10 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'}`} style={{ transitionDelay: '200ms' }}>
            <span className="font-en text-base font-semibold text-muted-foreground tracking-[0.1em] uppercase">Pro</span>
            <div className="mt-4 flex items-baseline gap-1"><span className="font-mono font-bold text-foreground" style={{ fontSize: 'clamp(40px, 5vw, 52px)' }}>{t(annual ? '৳২,৩৯৯' : '৳২,৯৯৯', annual ? '৳2,399' : '৳2,999')}</span><span className="font-bn text-lg text-muted-foreground">/{t('মাস', 'mo')}</span></div>
            {annual && <span className="inline-block mt-2 text-xs font-semibold text-brand-green bg-brand-green/10 rounded-full px-3 py-1">{t('৳৭,২০০ বাঁচবেন বছরে', 'Save ৳7,200/year')}</span>}
            <p className="mt-3 font-bn text-[15px] text-muted-foreground">{t('একক দোকানের জন্য পারফেক্ট', 'Perfect for single shops')}</p>
            <div className="h-px bg-border my-6" />
            <ul className="space-y-3">{proFeatures.map(f => (<li key={f} className="flex items-start gap-2.5 text-sm"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /><span className="font-bn text-foreground">{f}</span></li>))}</ul>
            <Link to="/auth" className="mt-8 block w-full text-center font-bn text-base font-bold text-primary border-2 border-primary rounded-full py-3.5 hover:bg-primary hover:text-primary-foreground transition-all duration-200">Pro {t('শুরু করুন', 'Start')}</Link>
          </div>
          <div className={`relative bg-primary rounded-3xl p-10 text-primary-foreground scale-[1.02] shadow-[0_24px_80px_rgba(255,81,0,0.35)] transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'}`} style={{ transitionDelay: '300ms' }}>
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-card text-primary text-xs font-body font-semibold rounded-full px-5 py-1.5">{t('সবচেয়ে জনপ্রিয়', 'Most Popular')}</span>
            <span className="font-en text-base font-semibold text-primary-foreground/70 tracking-[0.1em] uppercase">Agency</span>
            <div className="mt-4 flex items-baseline gap-1"><span className="font-mono font-bold text-primary-foreground" style={{ fontSize: 'clamp(40px, 5vw, 52px)' }}>{t(annual ? '৳৬,৩৯৯' : '৳৭,৯৯৯', annual ? '৳6,399' : '৳7,999')}</span><span className="font-bn text-lg text-primary-foreground/60">/{t('মাস', 'mo')}</span></div>
            <p className="mt-3 font-bn text-[15px] text-primary-foreground/75">{t('একাধিক ক্লায়েন্ট ম্যানেজ করুন', 'Manage multiple clients')}</p>
            <div className="h-px bg-primary-foreground/20 my-6" />
            <ul className="space-y-3">{agencyFeatures.map(f => (<li key={f} className="flex items-start gap-2.5 text-sm"><Check className="w-4 h-4 text-primary-foreground/90 shrink-0 mt-0.5" /><span className="font-bn text-primary-foreground">{f}</span></li>))}</ul>
            <Link to="/auth" className="mt-8 block w-full text-center font-bn text-base font-bold bg-card text-primary rounded-full py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:bg-card/90 hover:-translate-y-0.5 transition-all duration-200">Agency {t('শুরু করুন', 'Start')}</Link>
          </div>
        </div>
        <div className={`mt-12 text-center transition-all duration-700 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="font-bn text-sm text-muted-foreground mb-3">{t('গ্রহণযোগ্য পেমেন্ট পদ্ধতি:', 'Accepted payment methods:')}</p>
          <div className="flex flex-wrap justify-center gap-3">{[{name:'bKash',color:'#E2136E'},{name:'Nagad',color:'#F6921E'},{name:'Rocket',color:'#8B2F89'},{name:'Visa',color:'#1A1F71'},{name:'Mastercard',color:'#EB001B'}].map(m=>(<span key={m.name} className="font-body text-xs font-semibold rounded-full px-3 py-1" style={{color:m.color,background:`${m.color}10`,border:`1px solid ${m.color}20`}}>{m.name}</span>))}</div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
