import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Copy, Star, Trash2, RotateCcw, X, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Calendar, Target, Zap, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface AdCreative {
  id: string;
  headline: string | null;
  body: string | null;
  cta: string | null;
  dhoom_score: number | null;
  copy_score: number | null;
  platform: string | null;
  framework: string | null;
  tone: string | null;
  language: string | null;
  occasion: string | null;
  product_name: string | null;
  is_winner: boolean;
  score_reason: string | null;
  improvement_note: string | null;
  created_at: string;
  source_url: string | null;
}

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'bg-blue-500/10 text-blue-600',
  instagram: 'bg-pink-500/10 text-pink-600',
  daraz: 'bg-orange-500/10 text-orange-600',
  google: 'bg-green-500/10 text-green-600',
};

const FRAMEWORK_LABELS: Record<string, string> = {
  FOMO: 'FOMO',
  PAS: 'PAS',
  AIDA: 'AIDA',
  social_proof: 'Social Proof',
  before_after: 'Before-After',
  offer_first: 'Offer-First',
};

const AdHistory = () => {
  const { activeWorkspace } = useAuth();
  const { t, lang } = useLanguage();

  const [ads, setAds] = useState<AdCreative[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all');
  const [selectedAd, setSelectedAd] = useState<AdCreative | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAds = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ad_creatives')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAds((data as AdCreative[]) || []);
    } catch (e) {
      console.error(e);
      toast.error(t('লোড করতে সমস্যা হয়েছে', 'Failed to load'));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, t]);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  const filteredAds = ads.filter(ad => {
    if (platformFilter !== 'all' && ad.platform !== platformFilter) return false;
    if (frameworkFilter !== 'all' && ad.framework !== frameworkFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        ad.headline?.toLowerCase().includes(q) ||
        ad.body?.toLowerCase().includes(q) ||
        ad.product_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const copyAd = (ad: AdCreative) => {
    const text = [ad.headline, ad.body, ad.cta].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedId(ad.id);
    toast.success(t('কপি হয়েছে!', 'Copied!'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteAd = async (id: string) => {
    try {
      await supabase.from('ad_creatives').delete().eq('id', id);
      setAds(prev => prev.filter(a => a.id !== id));
      if (selectedAd?.id === id) setSelectedAd(null);
      toast.success(t('মুছে ফেলা হয়েছে', 'Deleted'));
    } catch {
      toast.error(t('মুছতে সমস্যা হয়েছে', 'Delete failed'));
    }
  };

  const toggleWinner = async (ad: AdCreative) => {
    const newVal = !ad.is_winner;
    await supabase.from('ad_creatives').update({ is_winner: newVal }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, is_winner: newVal } : a));
    toast.success(newVal ? t('উইনার হিসেবে চিহ্নিত', 'Marked as winner') : t('উইনার সরানো হয়েছে', 'Unmarked as winner'));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (lang === 'bn') {
      return d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const ScoreBadge = ({ score, label }: { score: number | null; label: string }) => {
    if (!score) return null;
    const color = score >= 80 ? 'text-green-600 bg-green-500/10' : score >= 60 ? 'text-primary bg-primary/10' : 'text-amber-600 bg-amber-500/10';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${color}`}>
        {label}: {lang === 'bn' ? toBengali(score) : score}
      </span>
    );
  };

  // Unique platforms & frameworks for filters
  const platforms = [...new Set(ads.map(a => a.platform).filter(Boolean))];
  const frameworks = [...new Set(ads.map(a => a.framework).filter(Boolean))];

  // Lightbox navigation
  const currentIdx = selectedAd ? filteredAds.findIndex(a => a.id === selectedAd.id) : -1;
  const goPrev = () => currentIdx > 0 && setSelectedAd(filteredAds[currentIdx - 1]);
  const goNext = () => currentIdx < filteredAds.length - 1 && setSelectedAd(filteredAds[currentIdx + 1]);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden -m-3 sm:-m-6 md:-m-8">
      {/* Header */}
      <div className="shrink-0 bg-card border-b border-border px-4 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading-bn text-foreground">
                {t('বিজ্ঞাপন ইতিহাস', 'Ad History')}
              </h1>
              <p className="text-sm text-muted-foreground font-heading-bn mt-0.5">
                {t(`মোট ${toBengali(filteredAds.length)}টি বিজ্ঞাপন`, `${filteredAds.length} total ads`)}
              </p>
            </div>
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-lg bg-gradient-cta text-primary-foreground text-sm font-heading-bn font-bold hover:scale-[1.02] transition-all"
            >
              {t('নতুন তৈরি করুন', 'Create New')}
            </Link>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('পণ্য বা হেডলাইন খুঁজুন...', 'Search product or headline...')}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm font-heading-bn text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <select
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm font-heading-bn text-foreground"
            >
              <option value="all">{t('সব প্ল্যাটফর্ম', 'All Platforms')}</option>
              {platforms.map(p => (
                <option key={p} value={p!}>{p}</option>
              ))}
            </select>
            <select
              value={frameworkFilter}
              onChange={e => setFrameworkFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm font-heading-bn text-foreground"
            >
              <option value="all">{t('সব ফ্রেমওয়ার্ক', 'All Frameworks')}</option>
              {frameworks.map(f => (
                <option key={f} value={f!}>{FRAMEWORK_LABELS[f!] || f}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-56 rounded-xl bg-secondary animate-pulse" />
              ))}
            </div>
          ) : filteredAds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText size={48} className="text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-bold font-heading-bn text-foreground mb-1">
                {search || platformFilter !== 'all' || frameworkFilter !== 'all'
                  ? t('কোনো ফলাফল পাওয়া যায়নি', 'No results found')
                  : t('এখনো কোনো বিজ্ঞাপন নেই', 'No ads yet')}
              </h3>
              <p className="text-sm text-muted-foreground font-heading-bn">
                {t('নতুন বিজ্ঞাপন তৈরি করুন', 'Create your first ad')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredAds.map((ad, idx) => (
                  <motion.div
                    key={ad.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => setSelectedAd(ad)}
                    className="group bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                  >
                    {/* Card header */}
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {ad.platform && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${PLATFORM_COLORS[ad.platform] || 'bg-muted text-muted-foreground'}`}>
                              {ad.platform}
                            </span>
                          )}
                          {ad.framework && (
                            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                              {FRAMEWORK_LABELS[ad.framework] || ad.framework}
                            </span>
                          )}
                          {ad.is_winner && (
                            <Star size={12} className="text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-heading-bn shrink-0">
                          {formatDate(ad.created_at)}
                        </span>
                      </div>

                      {ad.product_name && (
                        <p className="text-[11px] text-muted-foreground font-heading-bn mb-1.5 truncate">
                          {ad.product_name}
                        </p>
                      )}

                      {/* Headline */}
                      <h3 className="text-sm font-bold font-heading-bn text-foreground line-clamp-2 mb-1.5 leading-snug">
                        {ad.headline || t('শিরোনাম নেই', 'No headline')}
                      </h3>

                      {/* Body preview */}
                      <p className="text-xs text-muted-foreground font-heading-bn line-clamp-3 leading-relaxed">
                        {ad.body || ''}
                      </p>
                    </div>

                    {/* Card footer */}
                    <div className="px-4 py-2.5 bg-secondary/50 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ScoreBadge score={ad.dhoom_score} label={t('ধুম', 'Dhoom')} />
                        <ScoreBadge score={ad.copy_score} label={t('কপি', 'Copy')} />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); copyAd(ad); }}
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                        >
                          {copiedId === ad.id ? <CheckCircle size={13} className="text-green-500" /> : <Copy size={13} className="text-muted-foreground" />}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); toggleWinner(ad); }}
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                        >
                          <Star size={13} className={ad.is_winner ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Detail Modal */}
      <AnimatePresence>
        {selectedAd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedAd(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  {selectedAd.platform && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${PLATFORM_COLORS[selectedAd.platform] || 'bg-muted text-muted-foreground'}`}>
                      {selectedAd.platform}
                    </span>
                  )}
                  {selectedAd.framework && (
                    <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-bold">
                      {FRAMEWORK_LABELS[selectedAd.framework] || selectedAd.framework}
                    </span>
                  )}
                </div>
                <button onClick={() => setSelectedAd(null)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-4">
                {selectedAd.product_name && (
                  <p className="text-xs text-muted-foreground font-heading-bn flex items-center gap-1.5">
                    <Target size={12} /> {selectedAd.product_name}
                  </p>
                )}

                <div>
                  <h2 className="text-lg font-bold font-heading-bn text-foreground leading-snug mb-2">
                    {selectedAd.headline}
                  </h2>
                  <p className="text-sm text-muted-foreground font-heading-bn whitespace-pre-wrap leading-relaxed">
                    {selectedAd.body}
                  </p>
                </div>

                {selectedAd.cta && (
                  <div className="px-4 py-2.5 rounded-lg bg-primary/10 text-primary text-sm font-bold font-heading-bn text-center">
                    {selectedAd.cta}
                  </div>
                )}

                {/* Scores */}
                <div className="flex gap-3">
                  {selectedAd.dhoom_score && (
                    <div className="flex-1 p-3 rounded-lg bg-secondary text-center">
                      <p className="text-2xl font-bold text-foreground">{lang === 'bn' ? toBengali(selectedAd.dhoom_score) : selectedAd.dhoom_score}</p>
                      <p className="text-[11px] text-muted-foreground font-heading-bn">{t('ধুম স্কোর', 'Dhoom Score')}</p>
                    </div>
                  )}
                  {selectedAd.copy_score && (
                    <div className="flex-1 p-3 rounded-lg bg-secondary text-center">
                      <p className="text-2xl font-bold text-foreground">{lang === 'bn' ? toBengali(selectedAd.copy_score) : selectedAd.copy_score}</p>
                      <p className="text-[11px] text-muted-foreground font-heading-bn">{t('কপি স্কোর', 'Copy Score')}</p>
                    </div>
                  )}
                </div>

                {selectedAd.score_reason && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <p className="text-xs text-muted-foreground font-heading-bn flex items-center gap-1.5 mb-1">
                      <Zap size={12} className="text-amber-500" /> {t('স্কোর বিশ্লেষণ', 'Score Analysis')}
                    </p>
                    <p className="text-sm text-foreground font-heading-bn">{selectedAd.score_reason}</p>
                  </div>
                )}

                {selectedAd.improvement_note && (
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <p className="text-xs text-muted-foreground font-heading-bn flex items-center gap-1.5 mb-1">
                      <Target size={12} className="text-blue-500" /> {t('উন্নতির পরামর্শ', 'Improvement Suggestion')}
                    </p>
                    <p className="text-sm text-foreground font-heading-bn">{selectedAd.improvement_note}</p>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground font-heading-bn flex items-center gap-1">
                  <Calendar size={11} /> {formatDate(selectedAd.created_at)}
                </p>
              </div>

              {/* Modal actions */}
              <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border px-5 py-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => { if (currentIdx > 0) setSelectedAd(filteredAds[currentIdx - 1]); }}
                    disabled={currentIdx <= 0}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30"
                  >
                    <ChevronLeft size={16} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => { if (currentIdx < filteredAds.length - 1) setSelectedAd(filteredAds[currentIdx + 1]); }}
                    disabled={currentIdx >= filteredAds.length - 1}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30"
                  >
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyAd(selectedAd)}
                    className="px-4 py-2 rounded-lg bg-secondary text-sm font-heading-bn font-semibold text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
                  >
                    <Copy size={13} /> {t('কপি', 'Copy')}
                  </button>
                  <button
                    onClick={() => toggleWinner(selectedAd)}
                    className={`px-4 py-2 rounded-lg text-sm font-heading-bn font-semibold transition-colors flex items-center gap-1.5 ${
                      selectedAd.is_winner ? 'bg-amber-500/10 text-amber-600' : 'bg-secondary text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    <Star size={13} className={selectedAd.is_winner ? 'fill-amber-500' : ''} />
                    {selectedAd.is_winner ? t('উইনার', 'Winner') : t('উইনার করুন', 'Mark Winner')}
                  </button>
                  <button
                    onClick={() => { deleteAd(selectedAd.id); }}
                    className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-heading-bn hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdHistory;
