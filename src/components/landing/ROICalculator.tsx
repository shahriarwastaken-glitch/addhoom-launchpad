import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';

const toBengali = (n: number) => Math.floor(n).toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const ROICalculator = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();
  const [budget, setBudget] = useState(25000);
  const [hours, setHours] = useState(20);
  const [platforms, setPlatforms] = useState<string[]>(['facebook']);
  const [result, setResult] = useState({
    annual_savings_bdt: 0,
    monthly_savings_bdt: 0,
    hours_saved_monthly: 0,
    roi_pct: 0,
    roas_boost: 25,
  });

  const fetchROI = useCallback(async () => {
    const { data } = await api.calculateRoi({
      monthly_spend_bdt: budget,
      hours_weekly: hours,
      platforms,
    });
    if (data) setResult(data);
  }, [budget, hours, platforms]);

  useEffect(() => {
    const timer = setTimeout(fetchROI, 300);
    return () => clearTimeout(timer);
  }, [fetchROI]);

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  return (
    <section ref={ref} className="py-24 px-4 bg-secondary">
      <div className="container mx-auto max-w-[860px]">
        <div className="text-center mb-12">
          <span className="section-label">{t('ROI ক্যালকুলেটর', 'ROI Calculator')}</span>
          <h2 className="mt-3 font-heading-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}>
            {t('দেখুন আপনি মাসে কত বাঁচাবেন', 'See How Much You Save Monthly')}
          </h2>
        </div>
        <div className={`bg-card rounded-3xl shadow-warm-lg p-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div>
                <label className="text-sm font-semibold text-foreground font-body-bn block mb-3">
                  {t('মাসিক বিজ্ঞাপন বাজেট', 'Monthly Ad Budget')}: <span className="font-mono text-primary">৳{toBengali(budget)}</span>
                </label>
                <input type="range" min={0} max={100000} step={1000} value={budget} onChange={e => setBudget(+e.target.value)}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border" style={{ accentColor: 'hsl(19, 100%, 50%)' }} />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground font-body-bn block mb-3">
                  {t('সাপ্তাহিক ঘণ্টা', 'Weekly Hours')}: <span className="font-mono text-primary">{toBengali(hours)}</span>
                </label>
                <input type="range" min={0} max={80} step={1} value={hours} onChange={e => setHours(+e.target.value)}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border" style={{ accentColor: 'hsl(19, 100%, 50%)' }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {['Facebook', 'Google', 'Instagram', 'TikTok'].map(p => (
                  <button key={p} onClick={() => togglePlatform(p.toLowerCase())}
                    className={`text-xs border rounded-full px-3 py-1.5 transition-colors ${platforms.includes(p.toLowerCase()) ? 'border-primary bg-primary/10 text-primary' : 'border-primary/30 text-primary hover:bg-primary/10'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-gradient-green rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <span className="text-primary-foreground/80 text-sm font-body-bn mb-2">{t('বার্ষিক সঞ্চয়', 'Annual Savings')}</span>
              <span className="text-4xl md:text-5xl font-mono font-bold text-primary-foreground mb-4">৳{toBengali(result.annual_savings_bdt)}</span>
              <div className="grid grid-cols-2 gap-4 w-full text-primary-foreground">
                <div>
                  <div className="text-lg font-mono font-bold">৳{toBengali(result.monthly_savings_bdt)}</div>
                  <div className="text-xs opacity-80 font-body-bn">{t('মাসিক', 'Monthly')}</div>
                </div>
                <div>
                  <div className="text-lg font-mono font-bold">{toBengali(result.hours_saved_monthly)} {t('ঘণ্টা', 'hrs')}</div>
                  <div className="text-xs opacity-80 font-body-bn">{t('সাশ্রয়কৃত', 'Saved')}</div>
                </div>
                <div>
                  <div className="text-lg font-mono font-bold">{toBengali(result.roi_pct)}%</div>
                  <div className="text-xs opacity-80">ROI</div>
                </div>
                <div>
                  <div className="text-lg font-mono font-bold">{toBengali(result.roas_boost)}%</div>
                  <div className="text-xs opacity-80 font-body-bn">ROAS {t('বৃদ্ধি', 'Boost')}</div>
                </div>
              </div>
              <Link to="/auth" className="mt-6 bg-card text-foreground rounded-full px-6 py-3 text-sm font-semibold hover:scale-[1.04] transition-transform shadow-warm">
                {t('শুরু করুন', 'Get Started')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ROICalculator;
