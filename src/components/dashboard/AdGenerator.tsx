import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Star, Copy, RefreshCw, Pencil, Check, X, Rocket, ArrowLeft, ArrowRight, Filter } from 'lucide-react';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

interface AdResult {
  id?: string;
  headline: string;
  body: string;
  cta: string;
  dhoom_score: number;
  copy_score: number;
  score_reason?: string;
  platform: string;
  framework: string;
  language?: string;
  is_winner?: boolean;
}

const PLATFORMS = ['facebook', 'instagram', 'google'];
const LANGUAGES = [
  { label: 'বাংলা', value: 'bn' },
  { label: 'English', value: 'en' },
  { label: 'দুটোই', value: 'both' },
];
const FRAMEWORKS = [
  { label: 'AIDA', value: 'AIDA' },
  { label: 'PAS', value: 'PAS' },
  { label: 'FOMO', value: 'FOMO' },
  { label: 'Before-After', value: 'before_after' },
  { label: 'Social Proof', value: 'social_proof' },
];
const OCCASIONS = [
  { bn: 'সাধারণ', en: 'General', v: 'general' },
  { bn: 'ঈদ', en: 'Eid', v: 'eid' },
  { bn: 'বৈশাখ', en: 'Boishakh', v: 'boishakh' },
  { bn: 'পূজা', en: 'Puja', v: 'puja' },
  { bn: '১৬ ডিসেম্বর', en: 'Victory Day', v: 'december16' },
  { bn: 'ভ্যালেন্টাইন', en: 'Valentine', v: 'valentine' },
  { bn: "মা দিবস", en: "Mother's Day", v: 'mothers_day' },
];
const TONES = [
  { bn: 'বন্ধুত্বপূর্ণ', en: 'Friendly', v: 'friendly' },
  { bn: 'পেশাদার', en: 'Professional', v: 'professional' },
  { bn: 'জরুরি', en: 'Urgent', v: 'urgent' },
  { bn: 'হাস্যরসাত্মক', en: 'Humorous', v: 'humorous' },
];
const VARIATIONS = [5, 10, 20, 50];

const AdGenerator = () => {
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();

  // Form state
  const [step, setStep] = useState(1);
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [price, setPrice] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook']);
  const [selectedLanguage, setSelectedLanguage] = useState('bn');
  const [selectedFramework, setSelectedFramework] = useState('AIDA');
  const [selectedOccasion, setSelectedOccasion] = useState('general');
  const [selectedTone, setSelectedTone] = useState('friendly');
  const [numVariations, setNumVariations] = useState(5);

  // Results state
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<AdResult[]>([]);
  const [sortBy, setSortBy] = useState<'dhoom' | 'copy'>('dhoom');
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ headline: string; body: string; cta: string }>({ headline: '', body: '', cta: '' });

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter(x => x !== p) : prev) : [...prev, p]
    );
  };

  const handleGenerate = async () => {
    if (!activeWorkspace) {
      toast.error(t('প্রথমে একটি শপ তৈরি করুন', 'Please create a shop first'));
      return;
    }
    if (!productName.trim() && !productUrl.trim()) {
      toast.error(t('পণ্যের নাম বা URL দিন', 'Enter product name or URL'));
      return;
    }

    setGenerating(true);
    setResults([]);

    try {
      const body: any = {
        workspace_id: activeWorkspace.id,
        product_name: productName,
        description: productDesc,
        price_bdt: price ? parseInt(price) : undefined,
        target_audience: targetAudience || undefined,
        platforms: selectedPlatforms,
        language: selectedLanguage,
        framework: selectedFramework,
        occasion: selectedOccasion,
        tone: selectedTone,
        num_variations: numVariations,
        source_url: productUrl || undefined,
      };

      const { data, error } = await supabase.functions.invoke('generate-ads', { body });

      if (error) throw error;

      if (data?.success && data.ads) {
        setResults(data.ads);
        setStep(4);
        toast.success(t(`${data.count}টি বিজ্ঞাপন তৈরি হয়েছে ⚡`, `${data.count} ads generated ⚡`));
      } else {
        toast.error(data?.message || t('সমস্যা হয়েছে', 'Something went wrong'));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(t('AI সমস্যা। আবার চেষ্টা করুন।', 'AI error. Please try again.'));
    } finally {
      setGenerating(false);
    }
  };

  const handleWinner = async (ad: AdResult) => {
    if (!ad.id) return;
    const newVal = !ad.is_winner;
    const { error } = await supabase
      .from('ad_creatives')
      .update({ is_winner: newVal } as any)
      .eq('id', ad.id);

    if (!error) {
      setResults(prev => prev.map(a => a.id === ad.id ? { ...a, is_winner: newVal } : a));
      toast.success(newVal
        ? t('Winner হিসেবে সেভ করা হয়েছে ⭐', 'Saved as Winner ⭐')
        : t('Winner সরানো হয়েছে', 'Removed from Winners')
      );
    }
  };

  const handleEdit = (ad: AdResult) => {
    setEditingId(ad.id || null);
    setEditData({ headline: ad.headline, body: ad.body, cta: ad.cta });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from('ad_creatives')
      .update({ headline: editData.headline, body: editData.body, cta: editData.cta } as any)
      .eq('id', editingId);

    if (!error) {
      setResults(prev => prev.map(a => a.id === editingId ? { ...a, ...editData } : a));
      setEditingId(null);
      toast.success(t('সংরক্ষিত ✅', 'Saved ✅'));
    }
  };

  const copyToClipboard = (ad: AdResult) => {
    navigator.clipboard.writeText(`${ad.headline}\n\n${ad.body}\n\n${ad.cta}`);
    toast.success(t('কপি হয়েছে!', 'Copied!'));
  };

  const handleRemix = async (ad: AdResult) => {
    if (!ad.id || !activeWorkspace) return;
    setGenerating(true);
    try {
      const { data } = await supabase.functions.invoke('remix-ad', {
        body: { workspace_id: activeWorkspace.id, ad_id: ad.id, num_variations: 2 },
      });
      if (data?.ads) {
        setResults(prev => [...prev, ...data.ads]);
        toast.success(t('Remix তৈরি হয়েছে!', 'Remix created!'));
      }
    } catch { /* ignore */ } finally { setGenerating(false); }
  };

  // Filtered & sorted results
  const displayedResults = results
    .filter(a => !filterPlatform || a.platform === filterPlatform)
    .sort((a, b) => sortBy === 'dhoom'
      ? (b.dhoom_score || 0) - (a.dhoom_score || 0)
      : (b.copy_score || 0) - (a.copy_score || 0)
    );

  const scoreColor = (s: number) => s >= 71 ? '#00B96B' : s >= 41 ? '#F59E0B' : '#EF4444';
  const scoreTextClass = (s: number) => s >= 71 ? 'text-brand-green' : s >= 41 ? 'text-yellow-500' : 'text-destructive';

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-heading-bn font-bold text-foreground mb-6">
        {t('আজ কী বানাবেন? ⚡', 'What will you create today? ⚡')}
      </h2>

      {step < 4 && (
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>
      )}

      {/* STEP 1 — Product Info */}
      {step === 1 && (
        <div className="bg-card rounded-2xl shadow-warm p-8 space-y-5 animate-fade-up">
          <h3 className="text-lg font-heading-bn font-semibold">{t('পণ্যের তথ্য', 'Product Info')}</h3>

          <div>
            <label className="text-sm font-semibold text-foreground font-body-bn mb-1.5 block">{t('পণ্যের নাম *', 'Product Name *')}</label>
            <input value={productName} onChange={e => setProductName(e.target.value)}
              placeholder={t('যেমন: কটন শার্ট, স্মার্টফোন কভার...', 'e.g., Cotton Shirt, Phone Cover...')}
              className="w-full p-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-body-bn text-sm" />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground font-body-bn mb-1.5 block">{t('বিবরণ', 'Description')}</label>
            <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)}
              placeholder={t('পণ্যের বিবরণ লিখুন', 'Describe your product')} rows={3}
              className="w-full p-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-body-bn text-sm resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground font-body-bn mb-1.5 block">{t('মূল্য (৳)', 'Price (৳)')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">৳</span>
                <input value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} placeholder="০"
                  className="w-full p-3.5 pl-8 rounded-xl border border-border bg-background text-foreground font-mono text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground font-body-bn mb-1.5 block">{t('টার্গেট', 'Target Audience')}</label>
              <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
                placeholder={t('খালি রাখলে Shop DNA ব্যবহার হবে', 'Leave empty to use Shop DNA')}
                className="w-full p-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-body-bn text-sm" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground font-body-bn mb-1.5 block">{t('অথবা প্রোডাক্ট URL', 'Or Product URL')}</label>
            <input value={productUrl} onChange={e => setProductUrl(e.target.value)}
              placeholder="https://daraz.com.bd/products/..."
              className="w-full p-3.5 rounded-xl border border-dashed border-primary/30 bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none font-body-bn text-sm" />
          </div>

          <button onClick={() => setStep(2)} disabled={!productName.trim() && !productUrl.trim()}
            className="w-full bg-gradient-cta text-primary-foreground rounded-full py-3.5 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform font-body-bn disabled:opacity-50 flex items-center justify-center gap-2">
            {t('পরবর্তী', 'Next')} <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* STEP 2 — Ad Settings */}
      {step === 2 && (
        <div className="bg-card rounded-2xl shadow-warm p-8 space-y-6 animate-fade-up">
          <h3 className="text-lg font-heading-bn font-semibold">{t('বিজ্ঞাপন সেটিংস', 'Ad Settings')}</h3>

          <PillGroup label={t('প্ল্যাটফর্ম', 'Platform')} options={PLATFORMS.map(p => ({ label: p.charAt(0).toUpperCase() + p.slice(1), value: p }))}
            selected={selectedPlatforms} onToggle={togglePlatform} multi />

          <PillGroup label={t('ভাষা', 'Language')} options={LANGUAGES.map(l => ({ label: l.label, value: l.value }))}
            selected={[selectedLanguage]} onToggle={v => setSelectedLanguage(v)} />

          <PillGroup label={t('ফ্রেমওয়ার্ক', 'Framework')} options={FRAMEWORKS}
            selected={[selectedFramework]} onToggle={v => setSelectedFramework(v)} />

          <PillGroup label={t('টোন', 'Tone')} options={TONES.map(to => ({ label: t(to.bn, to.en), value: to.v }))}
            selected={[selectedTone]} onToggle={v => setSelectedTone(v)} />

          <PillGroup label={t('উপলক্ষ', 'Occasion')} options={OCCASIONS.map(o => ({ label: t(o.bn, o.en), value: o.v }))}
            selected={[selectedOccasion]} onToggle={v => setSelectedOccasion(v)} />

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-border rounded-full py-3 font-semibold text-muted-foreground hover:text-foreground transition-colors font-body-bn flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> {t('আগের', 'Back')}
            </button>
            <button onClick={() => setStep(3)} className="flex-1 bg-gradient-cta text-primary-foreground rounded-full py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform font-body-bn flex items-center justify-center gap-2">
              {t('পরবর্তী', 'Next')} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Review & Generate */}
      {step === 3 && (
        <div className="bg-card rounded-2xl shadow-warm p-8 space-y-6 animate-fade-up">
          <h3 className="text-lg font-heading-bn font-semibold">{t('রিভিউ ও তৈরি করুন', 'Review & Generate')}</h3>

          <div className="bg-secondary rounded-xl p-5 text-sm font-body-bn space-y-2">
            <p><span className="font-semibold">{t('পণ্য:', 'Product:')}</span> {productName}</p>
            {price && <p><span className="font-semibold">{t('মূল্য:', 'Price:')}</span> ৳{price}</p>}
            <p><span className="font-semibold">{t('প্ল্যাটফর্ম:', 'Platform:')}</span> {selectedPlatforms.join(', ')}</p>
            <p><span className="font-semibold">{t('ভাষা:', 'Language:')}</span> {LANGUAGES.find(l => l.value === selectedLanguage)?.label}</p>
            <p><span className="font-semibold">{t('ফ্রেমওয়ার্ক:', 'Framework:')}</span> {selectedFramework}</p>
            <p><span className="font-semibold">{t('টোন:', 'Tone:')}</span> {selectedTone}</p>
            {selectedOccasion !== 'general' && <p><span className="font-semibold">{t('উপলক্ষ:', 'Occasion:')}</span> {selectedOccasion}</p>}
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">{t('কতটি ভ্যারিয়েশন?', 'How many variations?')}</label>
            <div className="flex flex-wrap gap-2">
              {VARIATIONS.map(n => (
                <button key={n} onClick={() => setNumVariations(n)}
                  className={`text-sm rounded-full px-4 py-2 transition-colors font-mono ${numVariations === n ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:border-primary hover:text-primary'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 border border-border rounded-full py-3 font-semibold text-muted-foreground hover:text-foreground transition-colors font-body-bn flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> {t('আগের', 'Back')}
            </button>
            <button onClick={handleGenerate} disabled={generating}
              className="flex-[2] bg-gradient-cta text-primary-foreground rounded-full py-4 text-lg font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-70 font-body-bn flex items-center justify-center gap-2">
              {generating ? (
                <>
                  <Rocket size={20} className="animate-bounce" />
                  {t('AI আপনার বিজ্ঞাপন লিখছে...', 'AI is writing your ads...')}
                </>
              ) : (
                <>⚡ {t('বিজ্ঞাপন তৈরি করুন', 'Generate Ads')}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 — Results */}
      {step === 4 && results.length > 0 && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setSortBy('dhoom')}
                className={`text-xs rounded-full px-3 py-1.5 transition-colors ${sortBy === 'dhoom' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {t('ধুম স্কোর ↓', 'Dhoom Score ↓')}
              </button>
              <button onClick={() => setSortBy('copy')}
                className={`text-xs rounded-full px-3 py-1.5 transition-colors ${sortBy === 'copy' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {t('কপি স্কোর ↓', 'Copy Score ↓')}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-muted-foreground" />
              <button onClick={() => setFilterPlatform(null)}
                className={`text-xs rounded-full px-3 py-1.5 transition-colors ${!filterPlatform ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {t('সব', 'All')}
              </button>
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setFilterPlatform(p)}
                  className={`text-xs rounded-full px-3 py-1.5 transition-colors capitalize ${filterPlatform === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-body-bn">
              {t(`${displayedResults.length}টি বিজ্ঞাপন`, `${displayedResults.length} ads`)}
            </p>
            <button onClick={() => { setStep(1); setResults([]); }}
              className="text-sm text-primary hover:underline font-body-bn">
              {t('নতুন তৈরি করুন', 'Create New')}
            </button>
          </div>

          {/* Ad Cards */}
          {displayedResults.map((ad, i) => (
            <div key={ad.id || i} className="bg-card rounded-2xl shadow-warm p-6 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-wider bg-secondary text-muted-foreground rounded px-2 py-0.5">{ad.platform}</span>
                    <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary rounded px-2 py-0.5">{ad.framework}</span>
                    {ad.is_winner && <span className="text-[10px] bg-yellow-500/20 text-yellow-600 rounded px-2 py-0.5">⭐ Winner</span>}
                  </div>

                  {editingId === ad.id ? (
                    <textarea value={editData.headline} onChange={e => setEditData(p => ({ ...p, headline: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-primary bg-background text-foreground font-heading-bn font-bold text-lg resize-none" rows={2} />
                  ) : (
                    <h4 className="text-lg font-heading-bn font-bold text-foreground leading-snug">{ad.headline}</h4>
                  )}
                </div>

                {/* Dhoom Score Gauge */}
                <div className="flex-shrink-0 text-center">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-border" />
                      <circle cx="32" cy="32" r="28" fill="none" stroke={scoreColor(ad.dhoom_score)} strokeWidth="4"
                        strokeDasharray={`${(ad.dhoom_score / 100) * 175.9} 175.9`} strokeLinecap="round" />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center font-mono font-bold text-sm ${scoreTextClass(ad.dhoom_score)}`}>
                      {ad.dhoom_score}
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground font-body-bn mt-1 block">{t('ধুম স্কোর', 'Dhoom')}</span>
                </div>
              </div>

              {/* Body */}
              {editingId === ad.id ? (
                <textarea value={editData.body} onChange={e => setEditData(p => ({ ...p, body: e.target.value }))}
                  className="w-full p-2 rounded-lg border border-primary bg-background text-foreground text-sm font-body-bn resize-none mb-3" rows={4} />
              ) : (
                <p className="text-sm text-muted-foreground font-body-bn mb-3 whitespace-pre-line">{ad.body}</p>
              )}

              {/* CTA */}
              {editingId === ad.id ? (
                <input value={editData.cta} onChange={e => setEditData(p => ({ ...p, cta: e.target.value }))}
                  className="w-full p-2 rounded-lg border border-primary bg-background text-foreground text-sm font-body-bn mb-3" />
              ) : (
                <span className="inline-block bg-primary/10 text-primary text-sm font-semibold rounded-full px-4 py-1.5 mb-3 font-body-bn">{ad.cta}</span>
              )}

              {/* Copy Score Bar */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] text-muted-foreground font-body-bn w-16">{t('কপি স্কোর', 'Copy')}</span>
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${ad.copy_score}%`, backgroundColor: scoreColor(ad.copy_score) }} />
                </div>
                <span className={`text-xs font-mono font-semibold ${scoreTextClass(ad.copy_score)}`}>{ad.copy_score}</span>
              </div>

              {/* Score Reason */}
              {ad.score_reason && (
                <p className="text-xs text-muted-foreground italic mb-3 font-body-bn">{ad.score_reason}</p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                {editingId === ad.id ? (
                  <>
                    <button onClick={handleSaveEdit} className="text-xs bg-brand-green text-white rounded-full px-3 py-1.5 flex items-center gap-1">
                      <Check size={12} /> {t('সংরক্ষণ', 'Save')}
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs bg-secondary text-muted-foreground rounded-full px-3 py-1.5 flex items-center gap-1">
                      <X size={12} /> {t('বাতিল', 'Cancel')}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleWinner(ad)} className={`text-xs rounded-full px-3 py-1.5 flex items-center gap-1 transition-colors ${ad.is_winner ? 'bg-yellow-500/20 text-yellow-600' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                      <Star size={12} fill={ad.is_winner ? 'currentColor' : 'none'} /> Winner
                    </button>
                    <button onClick={() => handleEdit(ad)} className="text-xs bg-secondary text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 flex items-center gap-1 transition-colors">
                      <Pencil size={12} /> {t('এডিট', 'Edit')}
                    </button>
                    <button onClick={() => copyToClipboard(ad)} className="text-xs bg-secondary text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 flex items-center gap-1 transition-colors">
                      <Copy size={12} /> {t('কপি', 'Copy')}
                    </button>
                    {ad.id && (
                      <button onClick={() => handleRemix(ad)} disabled={generating} className="text-xs bg-secondary text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 flex items-center gap-1 transition-colors disabled:opacity-50">
                        <RefreshCw size={12} /> Remix
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Reusable pill group
const PillGroup = ({
  label,
  options,
  selected,
  onToggle,
  multi = false,
}: {
  label: string;
  options: { label: string; value: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  multi?: boolean;
}) => (
  <div>
    <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.value} onClick={() => onToggle(o.value)}
          className={`text-sm rounded-full px-4 py-2 transition-colors font-body-bn ${selected.includes(o.value) ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:border-primary hover:text-primary'}`}>
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

export default AdGenerator;
