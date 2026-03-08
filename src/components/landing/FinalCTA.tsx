import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Rocket } from 'lucide-react';

const toBn = (n: number) => Math.floor(n).toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const CountUp = ({ end, suffix = '' }: { end: number; suffix?: string }) => {
  const [val, setVal] = useState(0);
  const elRef = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  useEffect(() => { const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.5 }); if (elRef.current) obs.observe(elRef.current); return () => obs.disconnect(); }, []);
  useEffect(() => { if (!started) return; const dur = 1200; const s = performance.now(); const tick = (now: number) => { const p = Math.min((now - s) / dur, 1); setVal(Math.round((1 - Math.pow(1 - p, 3)) * end)); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }, [started, end]);
  return <span ref={elRef}>{toBn(val)}{suffix}</span>;
};

const FinalCTA = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();
  return (
    <section ref={ref} className="relative py-[120px] px-6 overflow-hidden" style={{ background: '#1C1B1A' }}>
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/[0.15] blur-[120px]" />
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full bg-brand-purple/[0.08] blur-[80px]" />
      <div className={`relative z-[1] max-w-[900px] mx-auto text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'}`}>
        <span className="inline-flex items-center gap-2 border border-primary-foreground/20 rounded-full px-4 py-1.5 text-sm text-primary-foreground/70"><Rocket className="w-4 h-4" /> {t('আজই শুরু করুন', 'Start Today')}</span>
        <h2 className="mt-8" style={{ fontSize: 'clamp(36px, 5vw, 58px)', lineHeight: 1.15 }}>
          <span className="block font-bn font-bold text-primary-foreground">{t('বাংলাদেশের সেরা শপগুলো', 'Bangladesh\'s Best Shops')}</span>
          <span className="block font-bn font-bold text-primary" style={{ textShadow: '0 0 40px rgba(255,81,0,0.5)' }}>AdDhoom {t('ব্যবহার করছে।', 'are using.')}</span>
          <span className="block font-bn font-bold text-primary-foreground">{t('আপনি কবে শুরু করবেন?', 'When will you start?')}</span>
        </h2>
        <p className="mt-5 font-bn text-lg text-primary-foreground/65 max-w-[600px] mx-auto">{t('৩০ সেকেন্ডে সেটআপ। ক্রেডিট কার্ড লাগবে না। ৭ দিনের মধ্যে সন্তুষ্ট না হলে সম্পূর্ণ অর্থ ফেরত।', '30s setup. No credit card. Full refund within 7 days.')}</p>
        <Link to="/auth" className="inline-block mt-12 font-bn text-xl font-bold text-primary-foreground bg-primary rounded-full px-14 py-5 shadow-[0_16px_64px_rgba(255,81,0,0.4)] hover:scale-[1.04] transition-all duration-300">{t('বিনামূল্যে শুরু করুন →', 'Start Free →')}</Link>
        <p className="mt-4 text-sm text-primary-foreground/50 font-body">{t('ইতিমধ্যে অ্যাকাউন্ট আছে?', 'Already have an account?')} <Link to="/auth" className="underline hover:text-primary-foreground">{t('লগইন করুন', 'Login')}</Link></p>
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-0 sm:divide-x sm:divide-primary-foreground/10">
          {[{ num: 500, suffix: '+', lBn: 'সক্রিয় শপ মালিক', lEn: 'Active shop owners' }, { num: 3, suffix: '.২×', lBn: 'গড় ROAS উন্নতি', lEn: 'Avg ROAS boost' }, { num: 12, suffix: '', lBn: 'ঘণ্টা মাসে সাশ্রয়', lEn: 'Hours saved/month' }].map((s, i) => (
            <div key={i} className="sm:px-10 text-center">
              <div className="font-mono text-4xl font-bold text-primary-foreground">{i === 1 ? '৩.২×' : <CountUp end={s.num} suffix={s.suffix} />}</div>
              <div className="font-bn text-sm text-primary-foreground/50 mt-1">{t(s.lBn, s.lEn)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
