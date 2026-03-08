import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Play, Zap, TrendingUp, Star, Target } from 'lucide-react';

const DhoomScoreRing = ({ score, size = 72 }: { score: number; size?: number }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} stroke="hsl(var(--border))" strokeWidth="6" fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke="hsl(var(--brand-orange))" strokeWidth="6" fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" className="rotate-90 origin-center font-mono text-[22px] font-bold fill-primary" transform={`rotate(90, ${size/2}, ${size/2})`}>{score}</text>
    </svg>
  );
};

const MetricBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="flex items-center gap-3 text-xs">
    <span className="font-bn text-muted-foreground w-16 text-right">{label}</span>
    <div className="flex-1 h-1 rounded-full bg-border overflow-hidden"><div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${value}%`, background: color }} /></div>
    <span className="font-mono text-[11px] text-muted-foreground w-8">{value}%</span>
  </div>
);

const Hero = () => {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const avatarColors = ['bg-primary', 'bg-brand-green', 'bg-brand-purple', 'bg-brand-yellow', 'bg-[#E4405F]'];
  const initials = ['রা', 'সা', 'তা', 'মা', 'ফা'];

  return (
    <section className="relative pt-[140px] pb-24 px-6 bg-background overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-brand-purple/[0.04] blur-[80px]" />
      <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[1.5fr_1fr] gap-16 items-center">
        <div>
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <span className="landing-pill"><span>🇧🇩</span> Made for Bangladesh · Powered by AI</span>
          </div>
          <h1 className={`mt-6 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            <span className="block font-bn font-bold text-foreground" style={{ fontSize: 'clamp(42px, 6vw, 72px)', lineHeight: 1.1 }}>{t('AI দিয়ে বানাও', 'Create with AI')}</span>
            <span className="block font-bn font-bold text-primary relative" style={{ fontSize: 'clamp(42px, 6vw, 72px)', lineHeight: 1.1 }}>{t('ধুম-তোলানো বিজ্ঞাপন', 'Explosive Ads')}<span className="absolute bottom-1 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-brand-yellow rounded-full opacity-30" /></span>
            <span className="block font-en font-[800] text-foreground italic" style={{ fontSize: 'clamp(38px, 5.5vw, 66px)', lineHeight: 1.1 }}>in seconds.</span>
          </h1>
          <p className={`mt-5 font-bn text-lg text-muted-foreground leading-relaxed max-w-[520px] transition-all duration-700 delay-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>{t('বাংলাদেশের ই-কমার্স শপ মালিকদের জন্য AI বিজ্ঞাপন টুল। Daraz · Facebook · Instagram এর জন্য সেরা কপি তৈরি করুন মাত্র কয়েক সেকেন্ডে।', 'AI advertising tool for Bangladesh e-commerce shop owners. Create best ad copy for Daraz · Facebook · Instagram in seconds.')}</p>
          <div className={`mt-6 flex items-center gap-6 flex-wrap transition-all duration-700 delay-[400ms] ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex -space-x-2.5">{initials.map((init, i) => (<div key={i} className={`w-8 h-8 rounded-full ${avatarColors[i]} border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary-foreground`}>{init}</div>))}</div>
            <div className="flex items-center gap-1.5"><Star className="w-4 h-4 fill-brand-yellow text-brand-yellow" /><span className="font-body text-sm font-semibold text-foreground">4.9/5</span></div>
            <span className="font-bn text-sm text-muted-foreground">{t('৫০০+ শপ মালিক ব্যবহার করছেন', '500+ shop owners using')}</span>
          </div>
          <div className={`mt-9 flex flex-wrap items-center gap-4 transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Link to="/auth" className="font-bn text-[17px] font-bold text-primary-foreground bg-primary rounded-full px-9 py-4 shadow-[0_8px_32px_rgba(255,81,0,0.35)] hover:-translate-y-0.5 hover:bg-accent transition-all">{t('শুরু করুন →', 'Get Started →')}</Link>
            <button className="font-body text-[15px] font-medium text-muted-foreground border border-border rounded-full px-7 py-4 hover:border-primary hover:text-primary transition-all duration-200 flex items-center gap-2"><Play className="w-4 h-4" /> {t('ডেমো দেখুন', 'Watch Demo')}</button>
          </div>
          <div className={`mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs font-body text-muted-foreground transition-all duration-700 delay-[600ms] ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <span>✓ {t('ক্রেডিট কার্ড লাগবে না', 'No credit card')}</span><span>·</span><span>✓ {t('৩০ সেকেন্ডে সেটআপ', '30s setup')}</span><span>·</span><span>✓ {t('বাংলায় সম্পূর্ণ', 'Fully in Bengali')}</span>
          </div>
        </div>
        <div className={`relative transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
          <div className="absolute -top-3 -right-2 z-10 bg-card rounded-full px-3 py-1.5 shadow-warm border-l-2 border-primary rotate-[8deg] animate-float text-[11px] font-bn font-semibold flex items-center gap-1.5"><Zap className="w-3 h-3 text-primary" /> {t('বাংলাদেশের #১ AI Ad টুল', '#1 BD AI Ad Tool')}</div>
          <div className="absolute -bottom-4 -left-4 z-10 bg-card rounded-full px-3 py-1.5 shadow-warm border-l-2 border-brand-green rotate-[-6deg] animate-float text-[11px] font-bn font-semibold" style={{ animationDelay: '2s' }}><span className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-brand-green" /> {t('৩.২× ROAS উন্নতি গড়ে', '3.2× avg ROAS boost')}</span></div>
          <div className="bg-card rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] p-7 animate-float" style={{ animationDuration: '5s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Target className="w-4 h-4 text-primary" /></div><span className="font-bn text-sm font-semibold text-foreground">{t('ধুম স্কোর বিশ্লেষণ', 'Dhoom Score Analysis')}</span></div>
              <span className="text-xs font-semibold text-brand-purple bg-brand-purple/10 border border-brand-purple/20 rounded-full px-2.5 py-0.5">AI</span>
            </div>
            <div className="h-px bg-border mb-4" />
            <span className="text-[11px] font-body text-muted-foreground uppercase tracking-[0.08em]">Generated Ad Copy</span>
            <div className="bg-secondary rounded-xl p-3.5 border-l-[3px] border-primary mb-2 mt-1"><p className="font-bn text-[15px] font-bold text-foreground">{t('ঈদ স্পেশাল অফার! ৫০% ছাড়', 'Eid Special! 50% Off')}</p></div>
            <p className="font-bn text-[13px] text-muted-foreground leading-relaxed mb-4">{t('সীমিত সময়ের জন্য! আজই অর্ডার করুন এবং পান ফ্রি ডেলিভারি সারা বাংলাদেশে', 'Limited time! Order today, free delivery across Bangladesh')}</p>
            <div className="flex items-start gap-6 mb-4">
              <div className="flex flex-col items-center flex-shrink-0"><DhoomScoreRing score={87} /><span className="font-bn text-[11px] text-muted-foreground mt-1">{t('ধুম স্কোর', 'Dhoom Score')}</span></div>
              <div className="flex-1 space-y-2.5 pt-2">
                <MetricBar label={t('হুক শক্তি', 'Hook')} value={82} color="hsl(var(--brand-orange))" />
                <MetricBar label={t('বাংলা ভাষা', 'Bengali')} value={91} color="hsl(var(--brand-green))" />
                <MetricBar label={t('CTA শক্তি', 'CTA')} value={74} color="hsl(var(--brand-yellow))" />
              </div>
            </div>
            <div><span className="text-[12px] font-bn text-muted-foreground">{t('ভালো কাজ করবে:', 'Works well on:')}</span>
              <div className="flex gap-2 mt-1.5">{[{ name: 'Facebook', color: '#1877F2' }, { name: 'Instagram', color: '#E4405F' }, { name: 'Daraz', color: '#FF5100' }].map(p => (<span key={p.name} className="flex items-center gap-1.5 text-[11px] rounded-full px-3 py-1" style={{ background: `${p.color}10`, color: p.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />{p.name}</span>))}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
