import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Wallet, Clock, TrendingUp, CalendarDays, Hand, User, Building2, CheckCircle2, XCircle } from 'lucide-react';

const BENCHMARKS = {
  freelancer_per_campaign_bdt: 3500,
  campaigns_per_month: 6,
  agency_monthly_bdt: 15000,
  founder_hourly_value_bdt: 400,
  replaced_tools_monthly_bdt: 1800,
  roas_improvement_percent: 25,
  addhoom_pro_bdt: 2999,
};

const toBn = (n: number) => {
  const formatted = Math.floor(Math.abs(n)).toLocaleString('en-IN');
  return formatted.replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);
};

function calculateROI(adSpend: number, weeklyHours: number, method: string, platforms: string[]) {
  const monthlyHours = weeklyHours * 4;
  const timeCostMonthly = monthlyHours * BENCHMARKS.founder_hourly_value_bdt;

  let creationCost = 0;
  if (method === 'freelancer') creationCost = BENCHMARKS.freelancer_per_campaign_bdt * BENCHMARKS.campaigns_per_month;
  if (method === 'agency') creationCost = BENCHMARKS.agency_monthly_bdt;

  const platformMultiplier = 1 + (platforms.length - 1) * 0.15;
  const toolCost = BENCHMARKS.replaced_tools_monthly_bdt;
  const totalCurrentCost = (timeCostMonthly + creationCost) * platformMultiplier + toolCost;

  const addoomCost = BENCHMARKS.addhoom_pro_bdt;
  const hoursSavedMonthly = Math.round(monthlyHours * 0.75);
  const remainingTimeCost = monthlyHours * 0.25 * BENCHMARKS.founder_hourly_value_bdt;
  const totalWithAddhoom = addoomCost + remainingTimeCost;

  let monthlySavings = totalCurrentCost - totalWithAddhoom;
  if (monthlySavings <= 0) monthlySavings = 500;
  const annualSavings = monthlySavings * 12;
  let roiPercent = Math.round((monthlySavings / BENCHMARKS.addhoom_pro_bdt) * 100);
  if (roiPercent > 1000) roiPercent = 1000;

  const roasGain = Math.round((adSpend * BENCHMARKS.roas_improvement_percent) / 100);
  let paybackDays = Math.round(BENCHMARKS.addhoom_pro_bdt / (monthlySavings / 30));
  if (paybackDays <= 0) paybackDays = 1;
  if (paybackDays > 365) paybackDays = 365;

  const timeSaved = Math.round(timeCostMonthly * 0.75);

  return { monthlySavings, annualSavings, roiPercent, hoursSavedMonthly, roasGain, paybackDays, timeSaved, creationSaved: creationCost, toolSaved: BENCHMARKS.replaced_tools_monthly_bdt, addoomCost: BENCHMARKS.addhoom_pro_bdt };
}

const AnimatedNumber = ({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = to;
    const dur = 600;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return <>{prefix}{toBn(display)}{suffix}</>;
};

type Method = 'myself' | 'freelancer' | 'agency';

const ROICalculator = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();
  const [adSpend, setAdSpend] = useState(15000);
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [method, setMethod] = useState<Method>('myself');
  const [platforms, setPlatforms] = useState<string[]>(['facebook']);

  const results = useMemo(() => calculateROI(adSpend, weeklyHours, method, platforms), [adSpend, weeklyHours, method, platforms]);

  const togglePlatform = (p: string) => setPlatforms(prev => prev.includes(p) ? (prev.length > 1 ? prev.filter(x => x !== p) : prev) : [...prev, p]);

  const methods: { key: Method; Icon: typeof Hand; labelBn: string; labelEn: string; hintBn?: string; hintEn?: string }[] = [
    { key: 'myself', Icon: Hand, labelBn: 'নিজে করি', labelEn: 'Myself', },
    { key: 'freelancer', Icon: User, labelBn: 'ফ্রিল্যান্সার', labelEn: 'Freelancer', hintBn: 'গড় খরচ: ৳৩,৫০০ প্রতি ক্যাম্পেইন', hintEn: 'Avg: ৳3,500/campaign' },
    { key: 'agency', Icon: Building2, labelBn: 'এজেন্সি', labelEn: 'Agency', hintBn: 'গড় রিটেইনার: ৳১৫,০০০/মাস', hintEn: 'Avg retainer: ৳15,000/mo' },
  ];

  const platformOptions = [
    { key: 'facebook', name: 'Facebook', color: '#1877F2' },
    { key: 'google', name: 'Google', color: '#00B96B' },
    { key: 'instagram', name: 'Instagram', color: '#E4405F' },
    { key: 'tiktok', name: 'TikTok', color: '#1C1B1A' },
  ];

  const spendPercent = ((adSpend - 5000) / (100000 - 5000)) * 100;
  const hoursPercent = ((weeklyHours - 2) / (40 - 2)) * 100;

  return (
    <section id="roi" ref={ref} className="py-24 px-6 bg-secondary">
      <div className="max-w-[1100px] mx-auto">
        <div className={`text-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'}`}>
          <span className="landing-pill">{t('ROI ক্যালকুলেটর', 'ROI Calculator')}</span>
          <h2 className="mt-3 font-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>{t('দেখুন আপনি মাসে কত বাঁচাবেন', 'See How Much You Save Monthly')}</h2>
          <p className="mt-3 font-bn text-lg text-muted-foreground">{t('আপনার তথ্য দিন — AdDhoom আপনার জন্য হিসাব করবে', 'Enter your info — AdDhoom calculates for you')}</p>
        </div>

        <div className={`bg-card rounded-3xl shadow-[0_8px_40px_rgba(255,81,0,0.1)] p-6 md:p-12 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Inputs */}
            <div className="space-y-8">
              {/* Ad Spend Slider */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-sm font-semibold text-foreground font-bn">{t('মাসিক বিজ্ঞাপন বাজেট', 'Monthly Ad Budget')}</label>
                  <span className="font-mono text-[22px] font-bold text-primary">৳{toBn(adSpend)}</span>
                </div>
                <p className="text-xs text-muted-foreground font-bn mb-3">{t('প্রতি মাসে Facebook/Google এ কত টাকা খরচ করেন?', 'How much do you spend on Facebook/Google per month?')}</p>
                <div className="relative h-1.5 rounded-full bg-border">
                  <div className="absolute h-full rounded-full bg-gradient-brand" style={{ width: `${spendPercent}%` }} />
                  <input type="range" min={5000} max={100000} step={1000} value={adSpend} onChange={e => setAdSpend(+e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-card border-2 border-primary shadow-[0_2px_8px_rgba(255,81,0,0.3)] pointer-events-none" style={{ left: `calc(${spendPercent}% - 10px)` }} />
                </div>
                <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground"><span>৳৫,০০০</span><span>৳১,০০,০০০</span></div>
              </div>

              {/* Hours Slider */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-sm font-semibold text-foreground font-bn">{t('বিজ্ঞাপনে সাপ্তাহিক ঘণ্টা', 'Weekly Hours on Ads')}</label>
                  <span className="font-mono text-[22px] font-bold text-primary">{toBn(weeklyHours)} {t('ঘণ্টা', 'hrs')}</span>
                </div>
                <p className="text-xs text-muted-foreground font-bn mb-3">{t('বিজ্ঞাপন তৈরি ও ম্যানেজ করতে সপ্তাহে কত ঘণ্টা লাগে?', 'Hours per week creating & managing ads?')}</p>
                <div className="relative h-1.5 rounded-full bg-border">
                  <div className="absolute h-full rounded-full bg-gradient-brand" style={{ width: `${hoursPercent}%` }} />
                  <input type="range" min={2} max={40} step={1} value={weeklyHours} onChange={e => setWeeklyHours(+e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-card border-2 border-primary shadow-[0_2px_8px_rgba(255,81,0,0.3)] pointer-events-none" style={{ left: `calc(${hoursPercent}% - 10px)` }} />
                </div>
                <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground"><span>{t('২ ঘণ্টা', '2 hrs')}</span><span>{t('৪০ ঘণ্টা', '40 hrs')}</span></div>
              </div>

              {/* Method */}
              <div>
                <label className="text-sm font-semibold text-foreground font-bn block mb-1">{t('বর্তমান পদ্ধতি', 'Current Method')}</label>
                <p className="text-xs text-muted-foreground font-bn mb-3">{t('কীভাবে বিজ্ঞাপন তৈরি করেন?', 'How do you create ads?')}</p>
                <div className="flex flex-wrap gap-2">
                  {methods.map(m => (
                    <button key={m.key} onClick={() => setMethod(m.key)}
                      className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bn font-semibold transition-all duration-200 ${method === m.key ? 'bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(255,81,0,0.3)]' : 'bg-card border border-border text-muted-foreground hover:border-primary/30'}`}>
                      <m.Icon className="w-4 h-4" /> {t(m.labelBn, m.labelEn)}
                    </button>
                  ))}
                </div>
                {methods.find(m => m.key === method)?.hintBn && (
                  <p className="mt-2 text-[11px] text-muted-foreground italic font-bn">{t(methods.find(m => m.key === method)!.hintBn!, methods.find(m => m.key === method)!.hintEn!)}</p>
                )}
              </div>

              {/* Platforms */}
              <div>
                <label className="text-sm font-semibold text-foreground font-bn block mb-1">{t('বিজ্ঞাপন প্ল্যাটফর্ম', 'Ad Platforms')}</label>
                <p className="text-xs text-muted-foreground font-bn mb-3">{t('কোন প্ল্যাটফর্মে বিজ্ঞাপন দেন? (একাধিক বেছে নিন)', 'Which platforms? (select multiple)')}</p>
                <div className="flex flex-wrap gap-2">
                  {platformOptions.map(p => {
                    const selected = platforms.includes(p.key);
                    return (
                      <button key={p.key} onClick={() => togglePlatform(p.key)}
                        className="rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200"
                        style={selected ? { background: p.color, color: '#fff' } : { background: 'transparent', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-primary/20 pt-4">
                <p className="text-[10px] text-muted-foreground italic font-bn">{t('* হিসাবগুলো বাংলাদেশের বাজারের গড় তথ্যের উপর ভিত্তি করে তৈরি। ব্যক্তিগত ফলাফল ভিন্ন হতে পারে।', '* Calculations based on Bangladesh market averages. Individual results may vary.')}</p>
              </div>
            </div>

            {/* Results */}
            <div className="rounded-[20px] p-8" style={{ background: 'linear-gradient(145deg, hsl(var(--secondary)), hsl(var(--background)))' }}>
              {/* Hero result */}
              <div className="text-center mb-6">
                <span className="text-xs text-muted-foreground uppercase tracking-[0.1em] font-body">{t('আপনার আনুমানিক বার্ষিক সঞ্চয়', 'Your Estimated Annual Savings')}</span>
                <div className="font-mono font-[800] text-primary mt-2" style={{ fontSize: 'clamp(36px, 5vw, 52px)' }}>
                  ৳<AnimatedNumber value={results.annualSavings} />
                </div>
                <span className="text-sm text-muted-foreground font-bn">{t('প্রতি বছর', 'per year')}</span>
              </div>

              <div className="h-px bg-border mb-6" />

              {/* 4 metric cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { Icon: Wallet, value: results.monthlySavings, prefix: '৳', label: t('প্রতি মাসে', 'Monthly'), color: 'text-brand-green' },
                  { Icon: Clock, value: results.hoursSavedMonthly, suffix: ` ${t('ঘণ্টা', 'hrs')}`, label: t('প্রতি মাসে', 'Monthly'), color: 'text-brand-purple' },
                  { Icon: TrendingUp, value: results.roiPercent, suffix: '%', label: t('বিনিয়োগে রিটার্ন', 'ROI'), color: 'text-primary' },
                  { Icon: CalendarDays, value: results.paybackDays, suffix: ` ${t('দিন', 'days')}`, label: t('পেব্যাক পিরিয়ড', 'Payback'), color: 'text-foreground' },
                ].map((m, i) => (
                  <div key={i} className="bg-card rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                    <m.Icon className={`w-5 h-5 ${m.color} mb-2`} />
                    <div className={`font-mono text-lg font-bold ${m.color}`}>
                      {m.prefix && m.prefix}<AnimatedNumber value={m.value} />{m.suffix}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-bn mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Breakdown - hidden on mobile */}
              <div className="hidden md:block">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.05em]">{t('সঞ্চয়ের বিবরণ', 'Savings Breakdown')}</span>
                <div className="mt-3 space-y-2 text-sm font-bn">
                  {[
                    { label: t('সময় সাশ্রয়', 'Time saved'), val: results.timeSaved, positive: true },
                    ...(method !== 'myself' ? [{ label: method === 'freelancer' ? t('ফ্রিল্যান্সার', 'Freelancer') : t('এজেন্সি', 'Agency'), val: results.creationSaved, positive: true }] : []),
                    { label: t('টুলস প্রতিস্থাপন', 'Tools replaced'), val: results.toolSaved, positive: true },
                    { label: `ROAS ${t('উন্নতি', 'boost')} (~25%)`, val: results.roasGain, positive: true },
                    { label: 'AdDhoom Pro', val: results.addoomCost, positive: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {item.positive ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" /> : <XCircle className="w-3.5 h-3.5 text-destructive/60" />}
                        {item.label}
                      </span>
                      <span className={item.positive ? 'text-brand-green font-mono' : 'text-muted-foreground font-mono'}>
                        {item.positive ? '+' : '-'}৳{toBn(item.val)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between font-bold text-primary">
                    <span>{t('মোট মাসিক সঞ্চয়', 'Total Monthly Savings')}</span>
                    <span className="font-mono">৳{toBn(results.monthlySavings)}</span>
                  </div>
                </div>
              </div>

              {/* ROAS callout */}
              <div className="mt-6 border-l-[3px] border-brand-green bg-[#F0FFF8] dark:bg-brand-green/10 rounded-xl p-4">
                <p className="text-xs font-bn text-foreground leading-relaxed">
                  <TrendingUp className="w-3.5 h-3.5 text-brand-green inline mr-1" />
                  {t(`আপনার ৳${toBn(adSpend)} বাজেট থেকে আনুমানিক ৳${toBn(results.roasGain)} বেশি রাজস্ব (২৫% ROAS উন্নতি)`, `From your ৳${toBn(adSpend)} budget, est. ৳${toBn(results.roasGain)} more revenue (25% ROAS boost)`)}
                </p>
              </div>

              {/* CTA */}
              <Link to="/auth" className="mt-6 block w-full text-center font-bn text-base font-bold text-primary-foreground bg-gradient-brand rounded-full py-4 shadow-orange-glow hover:scale-[1.02] transition-all duration-200">
                {t(`শুরু করুন — আজই ৳${toBn(results.monthlySavings)} বাঁচান`, `Get Started — Save ৳${toBn(results.monthlySavings)} today`)}
              </Link>
              <p className="text-center text-[11px] text-muted-foreground mt-2 font-bn">{t('৩০ সেকেন্ডে সেটআপ', '30s setup')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ROICalculator;
