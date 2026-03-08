import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

interface AdResult {
  headline: string;
  body: string;
  cta: string;
  dhoom_score: number;
  platform: string;
  framework: string;
  score_reason?: string;
  id?: string;
}

const AdGenerator = () => {
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [step, setStep] = useState(1);
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [price, setPrice] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['Facebook']);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('bn');
  const [selectedFramework, setSelectedFramework] = useState<string>('AIDA');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('regular');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<AdResult[]>([]);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleGenerate = async () => {
    if (!activeWorkspace) {
      toast.error(t('প্রথমে একটি শপ তৈরি করুন', 'Please create a shop first'));
      return;
    }

    setGenerating(true);
    try {
      let response;
      if (productUrl.trim()) {
        response = await api.generateAdsFromUrl({
          workspace_id: activeWorkspace.id,
          url: productUrl,
          platform: selectedPlatforms,
          language: selectedLanguage,
        });
      } else {
        response = await api.generateAds({
          workspace_id: activeWorkspace.id,
          product_name: productName,
          description: productDesc,
          price_bdt: price ? parseInt(price) : undefined,
          platform: selectedPlatforms,
          language: selectedLanguage,
          framework: selectedFramework,
          occasion: selectedOccasion,
          num_variations: 3,
        });
      }

      if (response.error) {
        toast.error(t(response.error.message_bn, response.error.message_en));
      } else if (response.data?.ads) {
        setResults(response.data.ads);
        setStep(4);
        toast.success(t('বিজ্ঞাপন তৈরি হয়েছে! ⚡', 'Ads generated! ⚡'));
      }
    } catch (e) {
      toast.error(t('কিছু একটা সমস্যা হয়েছে', 'Something went wrong'));
    } finally {
      setGenerating(false);
    }
  };

  const handleRemix = async (adId: string) => {
    if (!activeWorkspace || !adId) return;
    setGenerating(true);
    try {
      const response = await api.remixAd({
        workspace_id: activeWorkspace.id,
        ad_id: adId,
        num_variations: 2,
      });
      if (response.data?.ads) {
        setResults(prev => [...prev, ...response.data!.ads]);
        toast.success(t('Remix তৈরি হয়েছে!', 'Remix created!'));
      }
    } catch { /* ignore */ } finally { setGenerating(false); }
  };

  const copyToClipboard = (ad: AdResult) => {
    navigator.clipboard.writeText(`${ad.headline}\n\n${ad.body}\n\n${ad.cta}`);
    toast.success(t('কপি হয়েছে!', 'Copied!'));
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
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">🔗</span>
            <input value={productUrl} onChange={e => setProductUrl(e.target.value)}
              placeholder={t('অথবা প্রোডাক্ট URL পেস্ট করুন', 'Or paste product URL')}
              className="w-full p-4 pl-10 rounded-xl border border-dashed border-primary/30 bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-bn" />
          </div>
          <button onClick={() => productUrl.trim() ? handleGenerate() : setStep(2)}
            className="w-full bg-gradient-cta text-primary-foreground rounded-full py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform font-body-bn">
            {productUrl.trim() ? t('⚡ URL থেকে বিজ্ঞাপন তৈরি করুন', '⚡ Generate from URL') : t('পরবর্তী →', 'Next →')}
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
                <button key={p} onClick={() => togglePlatform(p)}
                  className={`text-sm rounded-full px-4 py-2 transition-colors ${selectedPlatforms.includes(p) ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:border-primary hover:text-primary'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">{t('ভাষা', 'Language')}</label>
            <div className="flex flex-wrap gap-2">
              {[{ label: 'বাংলা', value: 'bn' }, { label: 'English', value: 'en' }, { label: 'দুটোই', value: 'both' }].map(l => (
                <button key={l.value} onClick={() => setSelectedLanguage(l.value)}
                  className={`text-sm rounded-full px-4 py-2 transition-colors font-body-bn ${selectedLanguage === l.value ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:border-primary hover:text-primary'}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">{t('ফ্রেমওয়ার্ক', 'Framework')}</label>
            <div className="flex flex-wrap gap-2">
              {['AIDA', 'PAS', 'FOMO', 'Social Proof', 'Before-After'].map(f => (
                <button key={f} onClick={() => setSelectedFramework(f)}
                  className={`text-sm rounded-full px-4 py-2 transition-colors ${selectedFramework === f ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:border-primary hover:text-primary'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">{t('উপলক্ষ', 'Occasion')}</label>
            <div className="flex flex-wrap gap-2">
              {[{ bn: 'সাধারণ', en: 'Regular', v: 'regular' }, { bn: 'ঈদ', en: 'Eid', v: 'eid' }, { bn: 'বৈশাখ', en: 'Boishakh', v: 'boishakh' }, { bn: 'পূজা', en: 'Puja', v: 'puja' }].map(o => (
                <button key={o.v} onClick={() => setSelectedOccasion(o.v)}
                  className={`text-sm rounded-full px-4 py-2 transition-colors font-body-bn ${selectedOccasion === o.v ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:border-primary hover:text-primary'}`}>
                  {t(o.bn, o.en)}
                </button>
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
            <p><strong>{t('প্ল্যাটফর্ম:', 'Platform:')}</strong> {selectedPlatforms.join(', ')}</p>
            <p><strong>{t('ভাষা:', 'Language:')}</strong> {selectedLanguage === 'bn' ? t('বাংলা', 'Bangla') : selectedLanguage === 'en' ? 'English' : t('দুটোই', 'Both')}</p>
            <p><strong>{t('ফ্রেমওয়ার্ক:', 'Framework:')}</strong> {selectedFramework}</p>
            {selectedOccasion !== 'regular' && <p><strong>{t('উপলক্ষ:', 'Occasion:')}</strong> {selectedOccasion}</p>}
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
                  <div className="flex gap-2 mb-2">
                    <span className="text-xs bg-secondary rounded px-2 py-0.5 text-muted-foreground">{ad.platform}</span>
                    {ad.framework && <span className="text-xs bg-primary/10 text-primary rounded px-2 py-0.5">{ad.framework}</span>}
                  </div>
                  <h4 className="text-lg font-heading-bn font-bold text-foreground">{ad.headline}</h4>
                </div>
                <div className={`text-center ${scoreColor(ad.dhoom_score)}`}>
                  <div className="text-2xl font-mono font-bold">{toBengali(ad.dhoom_score)}</div>
                  <div className="text-[10px] font-body-bn">{t('ধুম স্কোর', 'Dhoom Score')}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground font-body-bn mb-3">{ad.body}</p>
              <span className="inline-block bg-primary/10 text-primary text-sm font-semibold rounded-full px-4 py-1.5 mb-2 font-body-bn">{ad.cta}</span>
              {ad.score_reason && (
                <p className="text-xs text-muted-foreground italic mb-3">{ad.score_reason}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                <button onClick={() => copyToClipboard(ad)} className="text-xs text-muted-foreground hover:text-foreground bg-secondary rounded-full px-3 py-1.5 transition-colors">📋 {t('কপি', 'Copy')}</button>
                {ad.id && (
                  <button onClick={() => handleRemix(ad.id!)} disabled={generating} className="text-xs text-muted-foreground hover:text-foreground bg-secondary rounded-full px-3 py-1.5 transition-colors">🔄 Remix</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdGenerator;
