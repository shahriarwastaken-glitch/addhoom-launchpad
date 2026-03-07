import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const AdGenerator = () => {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [price, setPrice] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Array<{ headline: { bn: string; en: string }; body: { bn: string; en: string }; cta: { bn: string; en: string }; score: number; platform: string }>>([]);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setResults([
        { headline: { bn: '🔥 ঈদে ৫০% ছাড়! সীমিত স্টক!', en: '🔥 50% Eid Discount! Limited!' }, body: { bn: 'আপনার প্রিয় পণ্যটি এখন অবিশ্বাস্য দামে। অর্ডার করুন আজই!', en: 'Your favorite product at an unbelievable price!' }, cta: { bn: 'এখনই কিনুন', en: 'Buy Now' }, score: 92, platform: 'Facebook' },
        { headline: { bn: '⚡ ফ্ল্যাশ সেল! মাত্র ২৪ ঘণ্টা!', en: '⚡ Flash Sale! 24 Hours Only!' }, body: { bn: 'তাড়াতাড়ি করুন! এই অফার আর আসবে না।', en: "Hurry! This offer won't come again." }, cta: { bn: 'অফার দেখুন', en: 'See Offer' }, score: 85, platform: 'Instagram' },
        { headline: { bn: '✨ নতুন কালেকশন এসেছে!', en: '✨ New Collection is Here!' }, body: { bn: 'ট্রেন্ডি ডিজাইন, সেরা কোয়ালিটি। স্টাইল আপগ্রেড করুন।', en: 'Trendy designs, best quality.' }, cta: { bn: 'দেখুন', en: 'Explore' }, score: 78, platform: 'Google' },
      ]);
      setGenerating(false);
      setStep(4);
    }, 2000);
  };

  const scoreColor = (s: number) => s >= 71 ? 'text-brand-green' : s >= 41 ? 'text-brand-yellow' : 'text-destructive';

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-heading-bn font-bold text-foreground mb-8">
        {t('আজ কী বানাবেন? ⚡', 'What will you create today? ⚡')}
      </h2>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-2 flex-1 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-border'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="bg-card rounded-[20px] shadow-warm p-8 space-y-5 animate-fade-up">
          <h3 className="text-lg font-heading-bn font-semibold">{t('পণ্যের তথ্য', 'Product Info')}</h3>
          <input value={productName} onChange={e => setProductName(e.target.value)}
            placeholder={t('যেমন: কটন শার্ট, স্মার্টফোন কভার...', 'e.g., Cotton Shirt, Phone Cover...')}
            className="w-full p-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-bn" />
          <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)}
            placeholder={t('পণ্যের বিবরণ', 'Product description')} rows={3}
            className="w-full p-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-bn resize-none" />
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">৳</span>
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="০"
              className="w-full p-4 pl-8 rounded-xl border border-border bg-background text-foreground font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
          </div>
          <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center cursor-pointer hover:bg-primary/5 transition-colors">
            <span className="text-primary font-body-bn font-semibold">{t('অথবা লিংক পেস্ট করুন 🔗', 'Or paste a link 🔗')}</span>
          </div>
          <button onClick={() => setStep(2)} className="w-full bg-gradient-cta text-primary-foreground rounded-full py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform font-body-bn">
            {t('পরবর্তী →', 'Next →')}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-card rounded-[20px] shadow-warm p-8 space-y-6 animate-fade-up">
          <h3 className="text-lg font-heading-bn font-semibold">{t('বিজ্ঞাপনের ধরন', 'Ad Type')}</h3>
          <div>
            <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">{t('প্ল্যাটফর্ম', 'Platform')}</label>
            <div className="flex flex-wrap gap-2">
              {['Facebook', 'Google', 'Instagram'].map(p => (
                <span key={p} className="text-sm border border-primary/30 text-primary rounded-full px-4 py-2 cursor-pointer hover:bg-primary/10 transition-colors">{p}</span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">{t('ভাষা', 'Language')}</label>
            <div className="flex flex-wrap gap-2">
              {[{ bn: 'বাংলা', en: 'Bangla' }, { bn: 'English', en: 'English' }, { bn: 'দুটোই', en: 'Both' }].map(l => (
                <span key={l.en} className="text-sm border border-border rounded-full px-4 py-2 cursor-pointer hover:border-primary hover:text-primary transition-colors font-body-bn">{t(l.bn, l.en)}</span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">{t('ফ্রেমওয়ার্ক', 'Framework')}</label>
            <div className="flex flex-wrap gap-2">
              {['AIDA', 'PAS', 'FOMO', 'Social Proof', 'Before-After'].map(f => (
                <span key={f} className="text-sm border border-border rounded-full px-4 py-2 cursor-pointer hover:border-primary hover:text-primary transition-colors">{f}</span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">{t('উপলক্ষ', 'Occasion')}</label>
            <div className="flex flex-wrap gap-2">
              {[{ bn: 'সাধারণ', en: 'Regular' }, { bn: 'ঈদ', en: 'Eid' }, { bn: 'বৈশাখ', en: 'Boishakh' }, { bn: 'পূজা', en: 'Puja' }].map(o => (
                <span key={o.en} className="text-sm border border-border rounded-full px-4 py-2 cursor-pointer hover:border-primary hover:text-primary transition-colors font-body-bn">{t(o.bn, o.en)}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-border rounded-full py-3 font-semibold text-muted-foreground hover:text-foreground transition-colors font-body-bn">
              {t('← আগের', '← Back')}
            </button>
            <button onClick={() => setStep(3)} className="flex-1 bg-gradient-cta text-primary-foreground rounded-full py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform font-body-bn">
              {t('পরবর্তী →', 'Next →')}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-card rounded-[20px] shadow-warm p-8 space-y-6 animate-fade-up">
          <h3 className="text-lg font-heading-bn font-semibold">{t('তৈরি করুন', 'Generate')}</h3>
          <div className="bg-secondary rounded-xl p-4 text-sm font-body-bn space-y-1">
            <p><strong>{t('পণ্য:', 'Product:')}</strong> {productName || t('উল্লেখ করা হয়নি', 'Not specified')}</p>
            <p><strong>{t('প্ল্যাটফর্ম:', 'Platform:')}</strong> Facebook, Instagram</p>
            <p><strong>{t('ভাষা:', 'Language:')}</strong> {t('বাংলা', 'Bangla')}</p>
          </div>
          <button onClick={handleGenerate} disabled={generating}
            className="w-full bg-gradient-cta text-primary-foreground rounded-full py-4 text-lg font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-70 font-body-bn">
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">🚀</span> {t('AI আপনার বিজ্ঞাপন লিখছে...', 'AI is writing your ads...')}
              </span>
            ) : (
              <span>⚡ {t('বিজ্ঞাপন তৈরি করুন', 'Generate Ads')}</span>
            )}
          </button>
        </div>
      )}

      {step === 4 && results.length > 0 && (
        <div className="space-y-4 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading-bn font-semibold">{t('ফলাফল', 'Results')}</h3>
            <button onClick={() => { setStep(1); setResults([]); }} className="text-sm text-primary hover:underline font-body-bn">
              {t('নতুন করে তৈরি করুন', 'Create New')}
            </button>
          </div>
          {results.map((ad, i) => (
            <div key={i} className="bg-card rounded-2xl shadow-warm p-6 animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <span className="text-xs bg-secondary rounded px-2 py-0.5 text-muted-foreground mb-2 inline-block">{ad.platform}</span>
                  <h4 className="text-lg font-heading-bn font-bold text-foreground">{t(ad.headline.bn, ad.headline.en)}</h4>
                </div>
                <div className={`text-center ${scoreColor(ad.score)}`}>
                  <div className="text-2xl font-mono font-bold">{toBengali(ad.score)}</div>
                  <div className="text-[10px] font-body-bn">{t('ধুম স্কোর', 'Dhoom Score')}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-body-bn mb-3">{t(ad.body.bn, ad.body.en)}</p>
              <span className="inline-block bg-primary/10 text-primary text-sm font-semibold rounded-full px-4 py-1.5 mb-4 font-body-bn">{t(ad.cta.bn, ad.cta.en)}</span>
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                {['⭐ Winner', '✏️ Edit', '📋 Copy', '🔄 Remix'].map(a => (
                  <button key={a} className="text-xs text-muted-foreground hover:text-foreground bg-secondary rounded-full px-3 py-1.5 transition-colors">{a}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdGenerator;
