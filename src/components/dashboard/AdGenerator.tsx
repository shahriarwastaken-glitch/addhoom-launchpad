import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Star, Copy, RefreshCw, Pencil, Check, X, Rocket, ArrowLeft, ArrowRight, Filter, Link2, ChevronDown, ChevronUp, AlertTriangle, Zap, Award, RotateCw, Search } from 'lucide-react';
import RocketLoader from '@/components/loaders/RocketLoader';

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
  adaptation_note?: string;
  improvement_note?: string;
  remixed_from_id?: string;
}

interface SourceAd {
  brand: string;
  headline: string | null;
  body: string | null;
  cta: string | null;
  product_type: string;
  framework_detected: string;
  emotional_angle: string;
  why_it_works: string;
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
const VARIATIONS_PRO = [5, 10];
const VARIATIONS_AGENCY = [5, 10, 20, 50];

const AdGenerator = () => {
  const { t, lang } = useLanguage();
  const { activeWorkspace, profile } = useAuth();
  const userPlan = profile?.plan || 'pro';
  const VARIATIONS = userPlan === 'agency' ? VARIATIONS_AGENCY : VARIATIONS_PRO;

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

  // URL extraction state
  const [extractUrl, setExtractUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractMode, setExtractMode] = useState<'ad_library' | 'product' | null>(null);
  const [sourceAd, setSourceAd] = useState<SourceAd | null>(null);
  const [adaptedAds, setAdaptedAds] = useState<AdResult[]>([]);
  const [showWhyItWorks, setShowWhyItWorks] = useState(false);

  // Remix state
  const [remixingId, setRemixingId] = useState<string | null>(null);
  const [showRemixDropdown, setShowRemixDropdown] = useState<string | null>(null);

  // Results state
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<AdResult[]>([]);
  const [sortBy, setSortBy] = useState<'dhoom' | 'copy'>('dhoom');
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ headline: string; body: string; cta: string }>({ headline: '', body: '', cta: '' });

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter(x => x !== p) : prev) : [...prev, p]
    );
  };

  const detectUrlType = (url: string) => {
    if (url.includes('facebook.com/ads/library')) return 'ad_library';
    if (url.includes('daraz.com.bd')) return 'daraz';
    return 'generic';
  };

  const handleExtractUrl = async () => {
    if (!activeWorkspace || !extractUrl.trim()) return;

    setExtracting(true);
    setExtractMode(null);
    setSourceAd(null);
    setAdaptedAds([]);

    try {
      const { data, error } = await supabase.functions.invoke('extract-from-url', {
        body: { url: extractUrl.trim(), workspace_id: activeWorkspace.id, language: selectedLanguage },
      });

      if (error) throw error;

      if (!data?.success) {
        toast.error(data?.message || t('সমস্যা হয়েছে', 'Something went wrong'));
        return;
      }

      if (data.mode === 'ad_library') {
        setExtractMode('ad_library');
        setSourceAd(data.source_ad);
        setAdaptedAds((data.adapted_ads || []).map((ad: any, i: number) => ({
          ...ad,
          platform: 'facebook',
          framework: ad.framework_used || 'AIDA',
          id: `adapted-${i}`,
        })));
        toast.success(t('বিজ্ঞাপন বিশ্লেষণ সম্পন্ন', 'Ad analysis complete'));
      } else {
        // Product mode — auto-fill form
        const p = data.product;
        if (p) {
          setProductName(p.product_name || '');
          setProductDesc(p.description || '');
          setPrice(p.price_bdt ? String(p.price_bdt) : '');
          setTargetAudience(p.target_audience || '');
          setProductUrl(extractUrl);
        }
        setExtractMode('product');
        toast.success(t('পণ্যের তথ্য সফলভাবে আনা হয়েছে', 'Product info extracted'));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(t('এই লিংক থেকে তথ্য আনা যায়নি। অন্য লিংক চেষ্টা করুন।', 'Could not fetch this URL. Try another link.'));
    } finally {
      setExtracting(false);
    }
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

  const handleWinner = async (ad: AdResult, isAdapted = false) => {
    if (isAdapted) {
      // For adapted ads (not in DB), just toggle locally
      setAdaptedAds(prev => prev.map(a => a.id === ad.id ? { ...a, is_winner: !a.is_winner } : a));
      toast.success(ad.is_winner ? t('Winner সরানো হয়েছে', 'Removed from Winners') : t('Winner হিসেবে সেভ করা হয়েছে ⭐', 'Saved as Winner ⭐'));
      return;
    }
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

  const startEdit = (ad: AdResult, idx?: number) => {
    setEditingId(ad.id || null);
    setEditIdx(idx !== undefined ? idx : null);
    setEditData({ headline: ad.headline, body: ad.body, cta: ad.cta });
  };

  const handleSaveEdit = async (isAdapted = false) => {
    if (isAdapted && editIdx !== null) {
      setAdaptedAds(prev => prev.map((a, i) => i === editIdx ? { ...a, ...editData } : a));
      setEditingId(null);
      setEditIdx(null);
      toast.success(t('সংরক্ষিত ✅', 'Saved ✅'));
      return;
    }
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

  const handleRemix = async (ad: AdResult, numVariations: number) => {
    if (!ad.id || !activeWorkspace) return;
    setRemixingId(ad.id);
    setShowRemixDropdown(null);
    try {
      const { data } = await supabase.functions.invoke('remix-ad', {
        body: { workspace_id: activeWorkspace.id, ad_id: ad.id, num_variations: numVariations },
      });
      if (data?.success && data.ads) {
        setResults(prev => [...prev, ...data.ads]);
        toast.success(
          data.has_winners
            ? t('Winner pattern থেকে রিমিক্স তৈরি হয়েছে ⚡', 'Remixed from winner patterns ⚡')
            : t('রিমিক্স তৈরি হয়েছে!', 'Remix created!')
        );
      } else {
        toast.error(data?.message || t('সমস্যা হয়েছে', 'Something went wrong'));
      }
    } catch {
      toast.error(t('রিমিক্স ব্যর্থ হয়েছে', 'Remix failed'));
    } finally {
      setRemixingId(null);
    }
  };

  const resetAll = () => {
    setStep(1);
    setResults([]);
    setExtractMode(null);
    setSourceAd(null);
    setAdaptedAds([]);
    setExtractUrl('');
    setProductName('');
    setProductDesc('');
    setPrice('');
    setProductUrl('');
    setTargetAudience('');
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

  // Highlight [PRODUCT] in text
  const highlightProduct = (text: string) => {
    const parts = text.split(/(\[PRODUCT\])/g);
    return parts.map((part, i) =>
      part === '[PRODUCT]'
        ? <span key={i} className="bg-primary/20 text-primary font-semibold px-1 rounded">[PRODUCT]</span>
        : part
    );
  };

  // Render an ad card (shared between normal results and adapted ads)
  const renderAdCard = (ad: AdResult, i: number, isAdapted = false) => {
    const isEditing = isAdapted ? editIdx === i : editingId === ad.id;

    return (
      <div key={ad.id || i} className="bg-card rounded-2xl shadow-warm p-6 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider bg-secondary text-muted-foreground rounded px-2 py-0.5">{ad.platform}</span>
              <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary rounded px-2 py-0.5">{ad.framework}</span>
              {ad.is_winner && <span className="text-[10px] bg-yellow-500/20 text-yellow-600 rounded px-2 py-0.5 flex items-center gap-0.5"><Award size={10} /> Winner</span>}
              {ad.remixed_from_id && <span className="text-[10px] bg-accent text-accent-foreground rounded px-2 py-0.5 flex items-center gap-0.5"><RotateCw size={10} /> Remixed</span>}
            </div>

            {isEditing ? (
              <textarea value={editData.headline} onChange={e => setEditData(p => ({ ...p, headline: e.target.value }))}
                className="w-full p-2 rounded-lg border border-primary bg-background text-foreground font-heading-bn font-bold text-lg resize-none" rows={2} />
            ) : (
              <h4 className="text-lg font-heading-bn font-bold text-foreground leading-snug">
                {isAdapted ? highlightProduct(ad.headline) : ad.headline}
              </h4>
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
        {isEditing ? (
          <textarea value={editData.body} onChange={e => setEditData(p => ({ ...p, body: e.target.value }))}
            className="w-full p-2 rounded-lg border border-primary bg-background text-foreground text-sm font-body-bn resize-none mb-3" rows={4} />
        ) : (
          <p className="text-sm text-muted-foreground font-body-bn mb-3 whitespace-pre-line">
            {isAdapted ? highlightProduct(ad.body) : ad.body}
          </p>
        )}

        {/* CTA */}
        {isEditing ? (
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
          <p className="text-xs text-muted-foreground italic mb-2 font-body-bn">{ad.score_reason}</p>
        )}

        {/* Adaptation Note */}
        {isAdapted && ad.adaptation_note && (
          <p className="text-xs text-primary/70 mb-3 font-body-bn">💡 {ad.adaptation_note}</p>
        )}

        {/* Improvement Note (Remix) */}
        {ad.improvement_note && (
          <p className="text-xs text-accent-foreground/70 italic mb-3 font-body-bn">🔄 {ad.improvement_note}</p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
          {isEditing ? (
            <>
              <button onClick={() => handleSaveEdit(isAdapted)} className="text-xs bg-brand-green text-white rounded-full px-3 py-1.5 flex items-center gap-1">
                <Check size={12} /> {t('সংরক্ষণ', 'Save')}
              </button>
              <button onClick={() => { setEditingId(null); setEditIdx(null); }} className="text-xs bg-secondary text-muted-foreground rounded-full px-3 py-1.5 flex items-center gap-1">
                <X size={12} /> {t('বাতিল', 'Cancel')}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => handleWinner(ad, isAdapted)} className={`text-xs rounded-full px-3 py-1.5 flex items-center gap-1 transition-colors ${ad.is_winner ? 'bg-yellow-500/20 text-yellow-600' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                <Star size={12} fill={ad.is_winner ? 'currentColor' : 'none'} /> Winner
              </button>
              <button onClick={() => startEdit(ad, isAdapted ? i : undefined)} className="text-xs bg-secondary text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 flex items-center gap-1 transition-colors">
                <Pencil size={12} /> {t('এডিট', 'Edit')}
              </button>
              <button onClick={() => copyToClipboard(ad)} className="text-xs bg-secondary text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 flex items-center gap-1 transition-colors">
                <Copy size={12} /> {t('কপি', 'Copy')}
              </button>
              {!isAdapted && ad.id && (
                <div className="relative">
                  <button
                    onClick={() => setShowRemixDropdown(showRemixDropdown === ad.id ? null : (ad.id || null))}
                    disabled={remixingId === ad.id}
                    className="text-xs bg-secondary text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {remixingId === ad.id ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        {t('Winner pattern থেকে শিখছে...', 'Learning from winners...')}
                      </>
                    ) : (
                      <>
                        <RefreshCw size={12} /> Remix <ChevronDown size={10} />
                      </>
                    )}
                  </button>
                  {showRemixDropdown === ad.id && (
                    <div className="absolute bottom-full mb-1 left-0 bg-card border border-border rounded-xl shadow-lg p-1 z-10 min-w-[140px]">
                      {[5, 10].map(n => (
                        <button
                          key={n}
                          onClick={() => handleRemix(ad, n)}
                          className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-secondary transition-colors font-body-bn"
                        >
                          {t(`${toBengali(n)}টি রিমিক্স করুন`, `Remix ${n} variations`)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-heading-bn font-bold text-foreground mb-6">
        {t('আজ কী বানাবেন? ⚡', 'What will you create today? ⚡')}
      </h2>

      {/* AD LIBRARY RESULTS VIEW */}
      {extractMode === 'ad_library' && sourceAd && adaptedAds.length > 0 && (
        <div className="space-y-6">
          {/* Product placeholder banner */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0" />
            <p className="text-sm font-body-bn text-yellow-700">
              {t('[PRODUCT] এর জায়গায় আপনার পণ্যের নাম বসান — Edit বাটনে ক্লিক করুন', 'Replace [PRODUCT] with your product name — click Edit')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-6">
            {/* LEFT PANEL — Source Ad */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-heading-bn font-semibold mb-4 flex items-center gap-2"><Search size={18} className="text-primary" /> {t('মূল বিজ্ঞাপন', 'Source Ad')}</h3>
              <div className="bg-card rounded-2xl shadow-warm p-6 space-y-4 sticky top-4">
                <span className="inline-block bg-primary/10 text-primary text-xs font-semibold rounded-full px-3 py-1 font-body-bn">{sourceAd.brand}</span>

                {sourceAd.headline && (
                  <div>
                    <p className="text-xs text-muted-foreground font-body-bn mb-1">{t('হেডলাইন', 'Headline')}</p>
                    <p className="text-sm font-semibold text-foreground font-body-bn">{sourceAd.headline}</p>
                  </div>
                )}

                {sourceAd.body && (
                  <div>
                    <p className="text-xs text-muted-foreground font-body-bn mb-1">{t('বডি কপি', 'Body Copy')}</p>
                    <p className="text-sm text-muted-foreground font-body-bn whitespace-pre-line">{sourceAd.body}</p>
                  </div>
                )}

                {sourceAd.cta && (
                  <div>
                    <p className="text-xs text-muted-foreground font-body-bn mb-1">CTA</p>
                    <span className="inline-block bg-secondary text-foreground text-xs rounded-full px-3 py-1">{sourceAd.cta}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2.5 py-1">{sourceAd.framework_detected}</span>
                  <span className="text-[10px] bg-accent text-accent-foreground rounded-full px-2.5 py-1">{sourceAd.emotional_angle}</span>
                  <span className="text-[10px] bg-secondary text-muted-foreground rounded-full px-2.5 py-1">{sourceAd.product_type}</span>
                </div>

                {/* Why it works collapsible */}
                <button onClick={() => setShowWhyItWorks(!showWhyItWorks)}
                  className="w-full flex items-center justify-between text-xs text-primary font-body-bn py-2 border-t border-border">
                  <span>{t('কেন কাজ করে?', 'Why it works?')}</span>
                  {showWhyItWorks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showWhyItWorks && (
                  <p className="text-xs text-muted-foreground font-body-bn animate-fade-up">{sourceAd.why_it_works}</p>
                )}
              </div>
            </div>

            {/* RIGHT PANEL — Adapted Ads */}
            <div className="md:col-span-3 space-y-4">
              <h3 className="text-lg font-heading-bn font-semibold mb-4">{t('🇧🇩 বাংলাদেশের জন্য অ্যাডাপ্টেড', '🇧🇩 Adapted for Bangladesh')}</h3>
              {adaptedAds.map((ad, i) => renderAdCard(ad, i, true))}
            </div>
          </div>

          <button onClick={resetAll}
            className="w-full border border-border rounded-full py-3 font-semibold text-muted-foreground hover:text-foreground transition-colors font-body-bn flex items-center justify-center gap-2">
            <ArrowLeft size={16} /> {t('নতুন তৈরি করুন', 'Create New')}
          </button>
        </div>
      )}

      {/* NORMAL FLOW (Steps 1-4) — only show if NOT in ad_library result mode */}
      {!(extractMode === 'ad_library' && sourceAd && adaptedAds.length > 0) && (
        <>
          {step < 4 && (
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-2 flex-1 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-border'}`} />
              ))}
            </div>
          )}

          {/* STEP 1 — Product Info */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-up">
              {/* URL EXTRACTION CARD */}
              <div className="border-2 border-dashed border-primary/40 rounded-2xl p-6 bg-primary/5 space-y-4">
                <div className="flex items-center gap-3">
                  <Link2 size={24} className="text-primary" />
                  <div>
                    <h3 className="text-base font-heading-bn font-semibold text-foreground">
                      {t('লিংক থেকে বিজ্ঞাপন তৈরি করুন', 'Create Ads from Link')}
                    </h3>
                    <p className="text-xs text-muted-foreground font-body-bn">
                      {t('Daraz প্রোডাক্ট, আপনার শপ, অথবা Facebook Ad Library লিংক দিন', 'Paste Daraz product, shop, or Facebook Ad Library link')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    value={extractUrl}
                    onChange={e => setExtractUrl(e.target.value)}
                    placeholder={t('https://daraz.com.bd/... অথবা facebook.com/ads/library/...', 'https://daraz.com.bd/... or facebook.com/ads/library/...')}
                    className="flex-1 p-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-body-bn text-sm"
                  />
                  <button
                    onClick={handleExtractUrl}
                    disabled={extracting || !extractUrl.trim()}
                    className="bg-gradient-cta text-primary-foreground rounded-xl px-5 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform font-body-bn disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    {extracting ? (
                      <Rocket size={16} className="animate-bounce" />
                    ) : (
                      <>⚡ {t('তথ্য আনুন', 'Extract')}</>
                    )}
                  </button>
                </div>

                {extracting && (
                  <p className="text-xs text-primary font-body-bn animate-pulse">
                    {extractUrl.includes('facebook.com/ads/library')
                      ? t('প্রতিযোগীর বিজ্ঞাপন বিশ্লেষণ হচ্ছে... বাংলাদেশের জন্য অ্যাডাপ্ট করা হচ্ছে...', 'Analyzing competitor ad... Adapting for Bangladesh...')
                      : t('পণ্যের তথ্য আনা হচ্ছে...', 'Extracting product info...')}
                  </p>
                )}

                {/* Hint pills */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] bg-secondary text-muted-foreground rounded-full px-3 py-1 font-body-bn">📦 Daraz {t('লিংক', 'link')}</span>
                  <span className="text-[10px] bg-secondary text-muted-foreground rounded-full px-3 py-1 font-body-bn">🌐 {t('শপের লিংক', 'Shop link')}</span>
                  <span className="text-[10px] bg-secondary text-muted-foreground rounded-full px-3 py-1 font-body-bn">🎯 FB Ad Library {t('লিংক', 'link')}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-body-bn">{t('অথবা ম্যানুয়ালি লিখুন', 'or enter manually')}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Manual form */}
              <div className="bg-card rounded-2xl shadow-warm p-8 space-y-5">
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

                <div>
                  <label className="text-sm font-semibold text-foreground font-body-bn mb-1.5 block">{t('মূল্য (৳)', 'Price (৳)')}</label>
                  <div className="relative max-w-[200px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">৳</span>
                    <input value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} placeholder="০"
                      className="w-full p-3.5 pl-8 rounded-xl border border-border bg-background text-foreground font-mono text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground font-body-bn mb-1.5 block">{t('টার্গেট অডিয়েন্স', 'Target Audience')}</label>
                  <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
                    placeholder={t('খালি রাখলে Shop DNA ব্যবহার হবে', 'Leave empty to use Shop DNA')}
                    className="w-full p-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-body-bn text-sm" />
                </div>

                <button onClick={() => setStep(2)} disabled={!productName.trim()}
                  className="w-full bg-gradient-cta text-primary-foreground rounded-full py-3.5 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform font-body-bn disabled:opacity-50 flex items-center justify-center gap-2">
                  {t('পরবর্তী', 'Next')} <ArrowRight size={16} />
                </button>
              </div>
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
                    <><Zap size={20} /> {t('বিজ্ঞাপন তৈরি করুন', 'Generate Ads')}</>
                  )}
                </button>
              </div>

              {generating && <RocketLoader />}
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
                <button onClick={resetAll}
                  className="text-sm text-primary hover:underline font-body-bn">
                  {t('নতুন তৈরি করুন', 'Create New')}
                </button>
              </div>

              {/* Ad Cards */}
              {displayedResults.map((ad, i) => renderAdCard(ad, i, false))}
            </div>
          )}
        </>
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
