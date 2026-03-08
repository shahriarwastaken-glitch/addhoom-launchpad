import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Search } from 'lucide-react';

const CompetitorIntel = () => {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = () => {
    if (!url.trim()) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setAnalyzed(true); }, 2000);
  };

  const mockAds = [
    { headline: { bn: '⚡ ফ্ল্যাশ সেল — ৫০% ছাড়!', en: '⚡ Flash Sale — 50% Off!' }, days: 14, framework: 'FOMO' },
    { headline: { bn: '🎉 ঈদ কালেকশন ২০২৬', en: '🎉 Eid Collection 2026' }, days: 7, framework: 'Social Proof' },
    { headline: { bn: '✨ নতুন আগমন — সীমিত স্টক', en: '✨ New Arrivals — Limited Stock' }, days: 21, framework: 'Scarcity' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-heading-bn font-bold text-foreground mb-8">
        {t('🔍 প্রতিযোগী গোয়েন্দা', '🔍 Competitor Intel')}
      </h2>

      <div className="bg-card rounded-[20px] shadow-warm p-8">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder={t('প্রতিযোগীর Facebook পেজ বা URL দিন', 'Enter competitor Facebook page or URL')}
              className="w-full p-3 pl-10 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-bn"
            />
          </div>
          <button onClick={handleAnalyze} disabled={loading}
            className="bg-gradient-cta text-primary-foreground rounded-xl px-6 font-semibold hover:scale-[1.02] transition-transform disabled:opacity-70 font-body-bn">
            {loading ? '...' : t('বিশ্লেষণ করুন', 'Analyze')}
          </button>
        </div>
      </div>

      {analyzed && (
        <div className="mt-8 space-y-6 animate-fade-up">
          {/* AI Analysis */}
          <div className="bg-card rounded-[20px] shadow-warm p-6 border-2 border-primary/20">
            <h3 className="font-heading-bn font-bold text-foreground mb-3">{t('🧠 AI বিশ্লেষণ', '🧠 AI Analysis')}</h3>
            <p className="text-sm text-muted-foreground font-body-bn mb-4">
              {t(
                'এই প্রতিযোগী মূলত FOMO এবং Price Anchoring ব্যবহার করছে। তারা ঈদ ক্যাম্পেইনে বেশি ফোকাস করছে। আপনার কাউন্টার স্ট্র্যাটেজি:',
                'This competitor mainly uses FOMO and Price Anchoring. They focus on Eid campaigns. Your counter strategy:'
              )}
            </p>
            <div className="grid gap-3">
              {[
                { bn: 'Social Proof দিয়ে বিশ্বাসযোগ্যতা বাড়ান', en: 'Build trust with Social Proof' },
                { bn: 'Value Proposition হাইলাইট করুন', en: 'Highlight your Value Proposition' },
                { bn: 'Before-After কনটেন্ট ব্যবহার করুন', en: 'Use Before-After content' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-brand-green/5 border border-brand-green/20">
                  <span className="text-brand-green font-bold text-sm">#{i + 1}</span>
                  <span className="text-sm text-foreground font-body-bn">{t(s.bn, s.en)}</span>
                  <button className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-3 py-1 font-body-bn">
                    {t('অ্যাড তৈরি করুন', 'Create Ad')}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Ads */}
          <div>
            <h3 className="font-heading-bn font-bold text-foreground mb-4">{t('সক্রিয় বিজ্ঞাপন', 'Active Ads')}</h3>
            <div className="grid gap-4">
              {mockAds.map((ad, i) => (
                <div key={i} className="bg-card rounded-2xl shadow-warm p-5 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-heading-bn font-bold text-foreground">{t(ad.headline.bn, ad.headline.en)}</p>
                    <div className="flex gap-3 mt-2">
                      <span className="text-xs bg-secondary rounded px-2 py-0.5 text-muted-foreground">{ad.days} {t('দিন ধরে চলছে', 'days running')}</span>
                      <span className="text-xs bg-brand-purple/10 text-brand-purple rounded px-2 py-0.5">{ad.framework}</span>
                    </div>
                  </div>
                  <button className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1.5 hover:bg-primary/20 transition-colors font-body-bn">
                    {t('এই ধরনের অ্যাড তৈরি করুন', 'Create similar ad')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorIntel;
