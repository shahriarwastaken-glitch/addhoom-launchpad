import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Target, Calendar, Search, Link2, Video, MessageCircle, HeartPulse, CheckCircle2, AlertTriangle, ArrowRight, Play } from 'lucide-react';

const Bar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="font-bn text-muted-foreground w-16 text-right shrink-0">{label}</span>
    <div className="flex-1 h-1 rounded-full bg-border overflow-hidden"><div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} /></div>
    <span className="font-mono text-[11px] text-muted-foreground w-7">{value}%</span>
  </div>
);

const DhoomRing = ({ score, size = 88 }: { score: number; size?: number }) => {
  const r = (size - 8) / 2; const circ = 2 * Math.PI * r; const offset = circ - (score / 100) * circ;
  return (<svg width={size} height={size} className="rotate-[-90deg]"><circle cx={size/2} cy={size/2} r={r} stroke="hsl(var(--border))" strokeWidth="5" fill="none" /><circle cx={size/2} cy={size/2} r={r} stroke="hsl(var(--brand-orange))" strokeWidth="5" fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" /><text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" className="rotate-90 origin-center font-mono text-[26px] font-bold fill-primary" transform={`rotate(90, ${size/2}, ${size/2})`}>{score}</text></svg>);
};

const FeatureBento = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();
  const cls = (delay: number) => `transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'}`;

  return (
    <section id="features" ref={ref} className="py-24 px-6 bg-background">
      <div className="max-w-[1200px] mx-auto">
        <div className={`text-center mb-16 ${cls(0)}`}>
          <span className="landing-pill">{t('ফিচারসমূহ', 'Features')}</span>
          <h2 className="mt-3 font-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>{t('একটি টুলে সব কিছু', 'Everything in One Tool')}</h2>
          <p className="mt-3 font-bn text-lg text-muted-foreground">{t('বিজ্ঞাপন তৈরি থেকে বিশ্লেষণ — সব এক জায়গায়', 'From ad creation to analysis — all in one place')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 auto-rows-auto">
          {/* Dhoom Score */}
          <div className={`lg:col-span-7 bg-card rounded-3xl border border-border p-8 relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] ${cls(100)}`} style={{ transitionDelay: '100ms' }}>
            <span className="absolute -top-2 left-4 font-mono text-[140px] font-bold text-primary/[0.04] leading-none select-none">৮৭</span>
            <div className="relative z-[1] grid md:grid-cols-2 gap-6">
              <div>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3"><Target className="w-8 h-8 text-primary" /></div>
                <span className="text-xs font-semibold text-brand-purple bg-brand-purple/10 rounded-full px-2.5 py-0.5">AI {t('স্কোরিং', 'Scoring')}</span>
                <h3 className="mt-3 font-bn text-[26px] font-bold text-foreground">{t('ধুম স্কোর', 'Dhoom Score')}</h3>
                <p className="mt-2 font-bn text-[15px] text-muted-foreground leading-relaxed">{t('প্রতিটি বিজ্ঞাপনকে ১-১০০ স্কেলে স্কোর করে। কোনটা Facebook এ সবচেয়ে বেশি বিক্রি আনবে — পোস্ট করার আগেই জানুন।', 'Scores every ad 1-100. Know what sells most on Facebook — before you post.')}</p>
                <div className="mt-4 space-y-2">{[t('৬টি মাত্রায় বিশ্লেষণ', '6-dimension analysis'), t('বাংলাদেশ মার্কেট ক্যালিব্রেটেড', 'BD market calibrated'), t('উন্নতির পরামর্শ', 'Improvement tips')].map(c => (<div key={c} className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" /><span className="font-bn text-foreground">{c}</span></div>))}</div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <DhoomRing score={87} />
                <div className="mt-4 w-full space-y-2">
                  <Bar label={t('হুক শক্তি', 'Hook')} value={82} color="hsl(var(--brand-orange))" />
                  <Bar label={t('বাংলা ভাষা', 'Bengali')} value={91} color="hsl(var(--brand-green))" />
                  <Bar label={t('CTA শক্তি', 'CTA')} value={74} color="hsl(var(--brand-yellow))" />
                  <Bar label={t('বাজার ফিট', 'Market')} value={85} color="hsl(var(--brand-purple))" />
                </div>
              </div>
            </div>
          </div>
          {/* Content Calendar */}
          <div className={`lg:col-span-5 lg:row-span-2 rounded-3xl p-8 text-primary-foreground hover:-translate-y-1 ${cls(200)}`} style={{ background: 'linear-gradient(160deg, #1C1B1A, #2D2B28)', transitionDelay: '200ms' }}>
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3"><Calendar className="w-6 h-6 text-primary" /></div>
            <span className="text-xs font-semibold text-brand-yellow bg-brand-yellow/10 rounded-full px-2.5 py-0.5">{t('অটো প্ল্যানিং', 'Auto Planning')}</span>
            <h3 className="mt-3 font-en text-[22px] font-bold">{t('৯০ দিনের কনটেন্ট ক্যালেন্ডার', '90-Day Content Calendar')}</h3>
            <p className="mt-2 font-bn text-[15px] text-primary-foreground/65 leading-relaxed">{t('ঈদ, পূজা, বৈশাখ — সব উৎসবের আগেই বিজ্ঞাপন রেডি।', 'Eid, Puja, Boishakh — ads ready before every festival.')}</p>
            <div className="mt-6 grid grid-cols-7 gap-1 text-center text-[10px]">
              {['র','স','ম','বু','বৃ','শু','শ'].map(d => <span key={d} className="text-primary-foreground/40 font-bn">{d}</span>)}
              {Array.from({length:28},(_,i) => {const f=[5,12,19].includes(i); const today=i===8; return (<div key={i} className={`aspect-square rounded-md flex items-center justify-center text-[9px] ${today?'bg-primary-foreground text-foreground border border-primary font-bold':f?'bg-primary/30 text-primary':'bg-primary-foreground/5 text-primary-foreground/40'}`}>{i+1}</div>);})}
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-xs font-bn text-primary-foreground/80 bg-primary/20 rounded-full px-3 py-1.5 inline-block">{t('ঈদুল ফিতর — ১৫ দিন বাকি', 'Eid ul Fitr — 15 days')}</div>
              <div className="text-xs font-bn text-primary-foreground/80 bg-brand-yellow/20 rounded-full px-3 py-1.5 inline-block">{t('পহেলা বৈশাখ — ৩২ দিন বাকি', 'Pohela Boishakh — 32 days')}</div>
            </div>
          </div>
          {/* Competitor Intel */}
          <div className={`lg:col-span-4 bg-card rounded-3xl border border-border p-7 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] ${cls(300)}`} style={{ transitionDelay: '300ms' }}>
            <div className="w-12 h-12 rounded-full bg-brand-green/10 flex items-center justify-center mb-3"><Search className="w-6 h-6 text-brand-green" /></div>
            <span className="text-xs font-semibold text-brand-green bg-brand-green/10 rounded-full px-2.5 py-0.5">{t('ইন্টেলিজেন্স', 'Intelligence')}</span>
            <h3 className="mt-3 font-bn text-xl font-bold text-foreground">{t('প্রতিযোগী কী করছে দেখুন', 'See What Competitors Do')}</h3>
            <p className="mt-2 font-bn text-sm text-muted-foreground leading-relaxed">{t('Facebook Ad Library থেকে প্রতিযোগীদের সেরা বিজ্ঞাপন খুঁজে পাল্টা কৌশল তৈরি করুন।', 'Find competitor best ads and create counter strategies.')}</p>
            <div className="mt-4 flex items-center gap-3 text-xs"><span className="bg-secondary rounded-lg px-3 py-2 font-bn">Shadhin Mart: 12 ads</span><ArrowRight className="w-4 h-4 text-muted-foreground" /><span className="bg-brand-green/10 text-brand-green rounded-lg px-3 py-2 font-bn">{t('আপনি: AI কৌশল', 'You: AI Strategy')} ✓</span></div>
          </div>
          {/* URL to Ad */}
          <div className={`lg:col-span-3 bg-secondary rounded-3xl p-7 hover:-translate-y-1 ${cls(400)}`} style={{ transitionDelay: '400ms' }}>
            <div className="w-12 h-12 rounded-full bg-brand-yellow/10 flex items-center justify-center mb-3"><Link2 className="w-6 h-6 text-brand-yellow" /></div>
            <span className="text-xs font-semibold text-brand-yellow bg-brand-yellow/10 rounded-full px-2.5 py-0.5">{t('স্মার্ট এক্সট্রাক্ট', 'Smart Extract')}</span>
            <h3 className="mt-3 font-bn text-xl font-bold text-foreground">{t('লিংক দিন, বিজ্ঞাপন পান', 'Give Link, Get Ad')}</h3>
            <p className="mt-2 font-bn text-sm text-muted-foreground">{t('Daraz এর লিংক দিন — AI অটো বিজ্ঞাপন বানাবে।', 'Give a Daraz link — AI creates ads automatically.')}</p>
            <div className="mt-4 flex items-center gap-2 bg-card rounded-xl p-2.5 border border-border"><span className="text-xs text-muted-foreground truncate flex-1 font-body">daraz.com.bd/product/...</span><div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0"><ArrowRight className="w-3.5 h-3.5 text-primary-foreground" /></div></div>
            <p className="mt-2 text-xs text-primary font-bn font-semibold">→ {t('৫টি বিজ্ঞাপন কপি তৈরি', '5 ad copies created')}</p>
          </div>
          {/* Video Ad */}
          <div className={`lg:col-span-4 rounded-3xl p-7 text-primary-foreground hover:-translate-y-1 ${cls(500)}`} style={{ background: 'linear-gradient(135deg, #6C3FE8, #8B5CF6)', transitionDelay: '500ms' }}>
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3"><Video className="w-6 h-6 text-white" /></div>
            <span className="text-xs font-semibold bg-white/10 rounded-full px-2.5 py-0.5">Pro {t('ফিচার', 'Feature')}</span>
            <h3 className="mt-3 font-en text-xl font-bold">{t('১৫ সেকেন্ড ভিডিও AI দিয়ে', '15s Video with AI')}</h3>
            <p className="mt-2 font-bn text-sm text-white/80">{t('পণ্যের ছবি দিন, AI ভিডিও বিজ্ঞাপন বানাবে।', 'Give product image, AI creates video ad.')}</p>
            <div className="mt-4 bg-black/30 rounded-xl aspect-video flex items-center justify-center relative"><Play className="w-10 h-10 text-white/70" /><span className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/50 rounded px-1.5 py-0.5">0:15</span></div>
          </div>
          {/* AI Chat */}
          <div className={`lg:col-span-4 bg-card rounded-3xl border border-border p-7 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] ${cls(600)}`} style={{ transitionDelay: '600ms' }}>
            <div className="w-12 h-12 rounded-full bg-brand-purple/10 flex items-center justify-center mb-3"><MessageCircle className="w-6 h-6 text-brand-purple" /></div>
            <span className="text-xs font-semibold text-brand-purple bg-brand-purple/10 rounded-full px-2.5 py-0.5">{t('চ্যাট', 'Chat')}</span>
            <h3 className="mt-3 font-bn text-xl font-bold text-foreground">{t('বাংলায় জিজ্ঞেস করুন, উত্তর পান', 'Ask in Bengali, Get Answers')}</h3>
            <p className="mt-2 font-bn text-sm text-muted-foreground">{t('আপনার শপের ডেটা জানা AI বিশেষজ্ঞ।', 'An AI expert that knows your shop data.')}</p>
            <div className="mt-4 space-y-2">
              <div className="bg-secondary rounded-xl rounded-bl-none p-3 text-xs font-bn text-foreground max-w-[85%]">{t('ঈদে কোন হেডলাইন বেশি ক্লিক পায়?', 'What headlines get more clicks during Eid?')}</div>
              <div className="bg-brand-purple/10 rounded-xl rounded-br-none p-3 text-xs font-bn text-brand-purple max-w-[85%] ml-auto">{t('ঈদ বিজ্ঞাপনে FOMO ফ্রেমওয়ার্ক সবচেয়ে...', 'In Eid ads, FOMO framework is the most...')}</div>
            </div>
          </div>
          {/* Account Doctor */}
          <div className={`lg:col-span-4 rounded-3xl p-7 hover:-translate-y-1 ${cls(700)}`} style={{ background: '#F0FFF8', transitionDelay: '700ms' }}>
            <div className="w-12 h-12 rounded-full bg-brand-green/10 flex items-center justify-center mb-3"><HeartPulse className="w-6 h-6 text-brand-green" /></div>
            <span className="text-xs font-semibold text-brand-green bg-brand-green/10 rounded-full px-2.5 py-0.5">{t('স্বাস্থ্য পরীক্ষা', 'Health Check')}</span>
            <h3 className="mt-3 font-bn text-xl font-bold text-foreground">{t('অ্যাকাউন্ট হেলথ স্কোর', 'Account Health Score')}</h3>
            <p className="mt-2 font-bn text-sm text-muted-foreground">{t('বিজ্ঞাপন কৌশলের দুর্বলতা খুঁজে সমাধান দেয় AI।', 'AI finds weaknesses and gives solutions.')}</p>
            <div className="mt-4 flex items-start gap-4">
              <span className="font-mono text-4xl font-bold text-brand-green">৭৮</span>
              <div className="space-y-1.5 text-xs font-bn">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-brand-green" /> {t('সক্রিয় ক্যাম্পেইন', 'Active campaigns')}</div>
                <div className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-brand-yellow" /> {t('CTA বৈচিত্র্য কম', 'Low CTA variety')}</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-brand-green" /> {t('ব্র্যান্ড টোন ঠিক আছে', 'Brand tone OK')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureBento;
