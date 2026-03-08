import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import RocketLoader from '@/components/loaders/RocketLoader';
import {
  Search, CheckCircle, XCircle, Swords, ChevronDown, ChevronUp, Copy,
  Loader2, ArrowLeft, RefreshCw, ArrowRight, Clock
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───
type Ad = { page_name: string; headline: string; body: string; caption: string; running_since: string };
type CounterStrategy = { title: string; description: string; example_hook: string };
type Analysis = {
  strategy_type: string; strengths: string[]; weaknesses: string[];
  top_patterns: string[]; counter_strategies: CounterStrategy[]; ads_analyzed: number;
};
type HistoryItem = {
  id: string; competitor_name: string; competitor_url: string | null;
  top_patterns: string[]; ads_count: number; created_at: string;
};
type DetailData = {
  id: string; competitor_name: string; competitor_url: string | null;
  ads_found: Ad[]; ai_analysis: Analysis; counter_strategies: CounterStrategy[];
  created_at: string;
};

// ─── Helpers ───
const relativeTime = (dateStr: string, lang: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'bn' ? 'এইমাত্র' : 'just now';
  if (mins < 60) return lang === 'bn' ? `${mins} মিনিট আগে` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === 'bn' ? `${hrs} ঘণ্টা আগে` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return lang === 'bn' ? `${days} দিন আগে` : `${days}d ago`;
  const months = Math.floor(days / 30);
  return lang === 'bn' ? `${months} মাস আগে` : `${months}mo ago`;
};

const toBanglaNum = (n: number) => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const avatarColors = [
  'bg-primary', 'bg-[hsl(var(--brand-green))]', 'bg-[hsl(var(--brand-purple))]',
  'bg-[hsl(var(--brand-yellow))]', 'bg-destructive',
];

const CompetitorIntel = () => {
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  // ─── NEW ANALYSIS TAB STATE ───
  const [competitorName, setCompetitorName] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [expandedAd, setExpandedAd] = useState<number | null>(null);

  // ─── HISTORY TAB STATE ───
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // ─── DETAIL VIEW STATE ───
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);

  // ─── COMPARISON STATE ───
  const [allCompetitors, setAllCompetitors] = useState<HistoryItem[]>([]);

  // ─── Fetch history ───
  const fetchHistory = useCallback(async (page = 1) => {
    if (!activeWorkspace) return;
    setHistoryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-competitor-history?workspace_id=${activeWorkspace.id}&page=${page}&limit=10`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const result = await response.json();

      if (result.success) {
        if (page === 1) {
          setHistory(result.analyses);
          setAllCompetitors(result.analyses);
        } else {
          setHistory(prev => [...prev, ...result.analyses]);
          setAllCompetitors(prev => [...prev, ...result.analyses]);
        }
        setHistoryTotal(result.total);
        setHistoryPage(page);
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    } finally {
      setHistoryLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory(1);
  }, [activeTab, fetchHistory]);

  // ─── Fetch detail ───
  const fetchDetail = async (analysisId: string) => {
    if (!activeWorkspace) return;
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-competitor-detail?analysis_id=${analysisId}&workspace_id=${activeWorkspace.id}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const result = await response.json();
      if (result.success) {
        setDetailData(result.analysis);
      } else {
        toast.error(t(result.message_bn || 'ত্রুটি', result.message_en || 'Error'));
        setShowDetail(false);
      }
    } catch {
      toast.error(t('বিস্তারিত লোড ব্যর্থ', 'Failed to load details'));
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Analyze ───
  const handleAnalyze = async (name?: string, url?: string) => {
    const cName = name || competitorName;
    if (!cName.trim()) return;
    if (!activeWorkspace) {
      toast.error(t('প্রথমে একটি শপ তৈরি করুন', 'Please create a shop first'));
      return;
    }

    setLoading(true);
    setAnalysis(null);
    setAds([]);
    if (name) setReanalyzing(name);
    try {
      const response = await api.competitorIntel({
        workspace_id: activeWorkspace.id,
        competitor_name: cName,
        competitor_page_url: url || pageUrl || undefined,
      });

      if (response.error) {
        toast.error(t(response.error.message_bn, response.error.message_en));
      } else if (response.data) {
        setAnalysis(response.data.analysis);
        setAds(response.data.ads || []);
        toast.success(t('নতুন বিশ্লেষণ সম্পন্ন হয়েছে ✓', 'New analysis complete ✓'));
        setActiveTab('new');
        // Refresh history
        fetchHistory(1);
        // If re-analyzed, open the detail of the new result
        if (response.data.saved_id) {
          fetchDetail(response.data.saved_id);
        }
      }
    } catch {
      toast.error(t('বিশ্লেষণ ব্যর্থ হয়েছে', 'Analysis failed'));
    } finally {
      setLoading(false);
      setReanalyzing(null);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('কপি হয়েছে!', 'Copied!'));
  };

  // ─── Filtered & sorted history ───
  const filteredHistory = history
    .filter(h => !searchQuery || h.competitor_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => sortOrder === 'desc'
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  const hasMore = history.length < historyTotal;

  // ─── DETAIL VIEW ───
  if (showDetail) {
    return (
      <div className="max-w-6xl mx-auto">
        {detailLoading ? (
          <RocketLoader />
        ) : detailData ? (
          <DetailView
            data={detailData}
            allCompetitors={allCompetitors}
            onBack={() => { setShowDetail(false); setDetailData(null); }}
            onReanalyze={() => handleAnalyze(detailData.competitor_name, detailData.competitor_url || undefined)}
            onCreateAd={() => navigate('/dashboard')}
            loading={loading}
            t={t}
            lang={lang}
            copyText={copyText}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-heading-bn font-bold text-foreground mb-4 sm:mb-6">
        {t('🔍 প্রতিযোগী গোয়েন্দা', '🔍 Competitor Intel')}
      </h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'new' ? 'bg-card shadow-warm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {t('নতুন বিশ্লেষণ', 'New Analysis')}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-card shadow-warm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {t('ইতিহাস', 'History')} {historyTotal > 0 && <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{lang === 'bn' ? toBanglaNum(historyTotal) : historyTotal}</span>}
        </button>
      </div>

      {/* Tab 1: New Analysis */}
      {activeTab === 'new' && (
        <>
          {/* Input Section */}
          <div className="bg-card rounded-[20px] shadow-warm p-4 sm:p-6 space-y-4 mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  value={competitorName}
                  onChange={e => setCompetitorName(e.target.value)}
                  placeholder={t('প্রতিযোগীর Facebook পেজের নাম', 'Competitor Facebook page name')}
                  className="w-full p-3 pl-10 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-bn"
                  onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                />
              </div>
              <button
                onClick={() => handleAnalyze()}
                disabled={loading || !competitorName.trim()}
                className="bg-gradient-cta text-primary-foreground rounded-xl px-6 py-3 sm:py-0 font-semibold hover:scale-[1.02] transition-transform disabled:opacity-70 font-body-bn flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                {loading ? t('বিশ্লেষণ হচ্ছে...', 'Analyzing...') : t('বিশ্লেষণ করুন 🔍', 'Analyze 🔍')}
              </button>
            </div>
            <input
              value={pageUrl}
              onChange={e => setPageUrl(e.target.value)}
              placeholder={t('Facebook পেজ URL (ঐচ্ছিক)', 'Facebook page URL (optional)')}
              className="w-full p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-bn"
            />
          </div>

          {loading && <RocketLoader />}

          {analysis && !loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
              {/* LEFT — Their Ads */}
              <div className="space-y-4">
                <h3 className="font-heading-bn font-bold text-foreground text-lg">
                  {t(`📢 তাদের বিজ্ঞাপন (${toBanglaNum(ads.length)}টি পাওয়া গেছে)`, `📢 Their Ads (${ads.length} found)`)}
                </h3>
                {ads.length === 0 ? (
                  <div className="bg-card rounded-[20px] shadow-warm p-6 text-center">
                    <p className="text-muted-foreground font-body-bn">{t('কোনো সক্রিয় বিজ্ঞাপন পাওয়া যায়নি।', 'No active ads found.')}</p>
                  </div>
                ) : (
                  ads.map((ad, i) => (
                    <div key={i} className="bg-card rounded-2xl shadow-warm p-5 border border-border hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1 font-medium">{ad.page_name}</span>
                        {ad.running_since && <span className="text-xs text-muted-foreground">{t('চলছে:', 'Running:')} {new Date(ad.running_since).toLocaleDateString('bn-BD')}</span>}
                      </div>
                      {ad.headline && <p className="font-heading-bn font-bold text-foreground mb-1">{ad.headline}</p>}
                      {ad.body && (
                        <div>
                          <p className={`text-sm text-muted-foreground font-body-bn ${expandedAd !== i ? 'line-clamp-3' : ''}`}>{ad.body}</p>
                          {ad.body.length > 150 && (
                            <button onClick={() => setExpandedAd(expandedAd === i ? null : i)} className="text-xs text-primary mt-1 flex items-center gap-1">
                              {expandedAd === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {expandedAd === i ? t('কম দেখুন', 'Show less') : t('আরো দেখুন', 'Show more')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* RIGHT — AI Analysis */}
              <div className="space-y-4">
                <div className="bg-card rounded-[20px] shadow-warm p-6 border-2 border-primary/20">
                  <h3 className="font-heading-bn font-bold text-foreground mb-2">{t('তাদের স্ট্র্যাটেজি', 'Their Strategy')}</h3>
                  <span className="inline-block bg-primary/10 text-primary font-bold rounded-full px-4 py-2 text-sm font-body-bn">{analysis.strategy_type}</span>
                </div>
                {analysis.strengths?.length > 0 && (
                  <div className="bg-card rounded-[20px] shadow-warm p-6">
                    <h3 className="font-heading-bn font-bold text-foreground mb-3">{t('✅ তাদের শক্তি', '✅ Their Strengths')}</h3>
                    <ul className="space-y-2">{analysis.strengths.map((s, i) => (<li key={i} className="flex items-start gap-2"><CheckCircle className="text-[hsl(var(--brand-green))] mt-0.5 shrink-0" size={16} /><span className="text-sm text-muted-foreground font-body-bn">{s}</span></li>))}</ul>
                  </div>
                )}
                {analysis.weaknesses?.length > 0 && (
                  <div className="bg-card rounded-[20px] shadow-warm p-6">
                    <h3 className="font-heading-bn font-bold text-foreground mb-3">{t('❌ তাদের দুর্বলতা', '❌ Their Weaknesses')}</h3>
                    <ul className="space-y-2">{analysis.weaknesses.map((w, i) => (<li key={i} className="flex items-start gap-2"><XCircle className="text-destructive mt-0.5 shrink-0" size={16} /><span className="text-sm text-muted-foreground font-body-bn">{w}</span></li>))}</ul>
                  </div>
                )}
                {analysis.top_patterns?.length > 0 && (
                  <div className="bg-card rounded-[20px] shadow-warm p-6">
                    <h3 className="font-heading-bn font-bold text-foreground mb-3">{t('📊 শীর্ষ প্যাটার্ন', '📊 Top Patterns')}</h3>
                    <ol className="space-y-2 list-decimal list-inside">{analysis.top_patterns.map((p, i) => (<li key={i} className="text-sm text-muted-foreground font-body-bn">{p}</li>))}</ol>
                  </div>
                )}
                {analysis.counter_strategies?.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-heading-bn font-bold text-foreground text-lg">{t('⚔️ কাউন্টার স্ট্র্যাটেজি', '⚔️ Counter Strategies')}</h3>
                    {analysis.counter_strategies.map((cs, i) => (
                      <div key={i} className="bg-card rounded-[20px] shadow-warm p-6 border-2 border-primary/30">
                        <div className="flex items-center gap-2 mb-2"><Swords className="text-primary" size={18} /><h4 className="font-heading-bn font-bold text-foreground">{cs.title}</h4></div>
                        <p className="text-sm text-muted-foreground font-body-bn mb-3">{cs.description}</p>
                        <div className="bg-primary/5 rounded-xl p-3 flex items-center justify-between gap-2">
                          <div><p className="text-xs text-muted-foreground mb-1">{t('উদাহরণ হুক:', 'Example hook:')}</p><p className="text-sm font-medium text-foreground font-body-bn">"{cs.example_hook}"</p></div>
                          <button onClick={() => copyText(cs.example_hook)} className="shrink-0 p-2 rounded-lg hover:bg-primary/10 transition-colors"><Copy size={14} className="text-primary" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab 2: History */}
      {activeTab === 'history' && (
        <>
          {historyLoading && history.length === 0 ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={32} /></div>
          ) : history.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-6xl mb-4">🔍</span>
              <h3 className="text-lg font-bold text-foreground mb-2 font-heading-bn">
                {t('এখনো কোনো প্রতিযোগী বিশ্লেষণ করা হয়নি', 'No competitor analyses yet')}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm font-body-bn">
                {t('প্রতিযোগীর Facebook পেজ বিশ্লেষণ করুন এবং তাদের চেয়ে এগিয়ে থাকুন', 'Analyze competitor Facebook pages and stay ahead of them')}
              </p>
              <button
                onClick={() => setActiveTab('new')}
                className="bg-gradient-cta text-primary-foreground rounded-xl px-6 py-3 font-semibold font-body-bn"
              >
                {t('প্রথম বিশ্লেষণ শুরু করুন', 'Start first analysis')}
              </button>
            </div>
          ) : (
            <>
              {/* Search + Sort */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('প্রতিযোগীর নাম খুঁজুন...', 'Search competitor name...')}
                    className="w-full p-2.5 pl-9 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-body-bn"
                  />
                </div>
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as 'desc' | 'asc')}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-body-bn"
                >
                  <option value="desc">{t('সর্বশেষ', 'Latest')}</option>
                  <option value="asc">{t('সবচেয়ে পুরনো', 'Oldest')}</option>
                </select>
              </div>

              {/* History Cards */}
              <div className="space-y-3">
                {filteredHistory.map((item, idx) => (
                  <div key={item.id} className="bg-card rounded-2xl shadow-warm p-4 sm:p-5 border border-border hover:border-primary/30 transition-colors">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-xl ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0`}>
                        {item.competitor_name[0]?.toUpperCase()}
                      </div>

                      {/* Center info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground font-body-bn truncate">{item.competitor_name}</p>
                        {item.competitor_url && (
                          <p className="text-xs text-muted-foreground truncate">{item.competitor_url}</p>
                        )}
                        {/* Patterns pills */}
                        {item.top_patterns.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.top_patterns.slice(0, 2).map((p, i) => (
                              <span key={i} className="text-[10px] bg-[hsl(var(--brand-purple))]/10 text-[hsl(var(--brand-purple))] rounded-full px-2 py-0.5 font-medium">
                                {typeof p === 'string' ? p.split(':')[0].split('—')[0].trim().slice(0, 25) : ''}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1.5 font-body-bn">
                          {lang === 'bn' ? `${toBanglaNum(item.ads_count)}টি অ্যাড বিশ্লেষণ করা হয়েছে` : `${item.ads_count} ads analyzed`}
                        </p>
                      </div>

                      {/* Right */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={12} /> {relativeTime(item.created_at, lang)}
                        </span>
                        <button
                          onClick={() => fetchDetail(item.id)}
                          className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                        >
                          {t('বিস্তারিত দেখুন', 'View details')} <ArrowRight size={12} />
                        </button>
                        <button
                          onClick={() => handleAnalyze(item.competitor_name, item.competitor_url || undefined)}
                          disabled={loading}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          {reanalyzing === item.competitor_name ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          {t('পুনরায় বিশ্লেষণ', 'Re-analyze')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => fetchHistory(historyPage + 1)}
                    disabled={historyLoading}
                    className="px-6 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors font-body-bn flex items-center gap-2"
                  >
                    {historyLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {t('আরো দেখুন', 'Load more')}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

// ─── DETAIL VIEW COMPONENT ───
const DetailView = ({
  data, allCompetitors, onBack, onReanalyze, onCreateAd, loading, t, lang, copyText,
}: {
  data: DetailData;
  allCompetitors: HistoryItem[];
  onBack: () => void;
  onReanalyze: () => void;
  onCreateAd: () => void;
  loading: boolean;
  t: (bn: string, en: string) => string;
  lang: string;
  copyText: (text: string) => void;
}) => {
  const ai = data.ai_analysis;
  const uniqueCompetitors = allCompetitors.filter(
    (c, i, arr) => arr.findIndex(x => x.competitor_name === c.competitor_name) === i
  );
  const showComparison = uniqueCompetitors.length >= 2;

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> {t('ইতিহাসে ফিরুন', 'Back to history')}
          </button>
          <h2 className="text-xl sm:text-2xl font-heading-bn font-bold text-foreground">{data.competitor_name}</h2>
          <p className="text-xs text-muted-foreground">{new Date(data.created_at).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button
          onClick={onReanalyze}
          disabled={loading}
          className="bg-gradient-cta text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-70"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {t('পুনরায় বিশ্লেষণ করুন', 'Re-analyze')}
        </button>
      </div>

      {/* Section 1: Strategy Overview */}
      <div className="bg-card rounded-[20px] shadow-warm p-5 sm:p-6 mb-6">
        <h3 className="font-heading-bn font-bold text-foreground mb-4">{t('🎯 স্ট্র্যাটেজি ওভারভিউ', '🎯 Strategy Overview')}</h3>
        <span className="inline-block bg-gradient-cta text-primary-foreground font-bold rounded-full px-5 py-2 text-sm mb-5">{ai?.strategy_type}</span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Strengths */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-[hsl(var(--brand-green))] font-heading-bn">{t('শক্তি', 'Strengths')}</h4>
            <div className="flex flex-wrap gap-1.5">
              {ai?.strengths?.map((s, i) => (
                <span key={i} className="text-xs bg-[hsl(var(--brand-green))]/10 text-[hsl(var(--brand-green))] rounded-full px-2.5 py-1">{s}</span>
              ))}
            </div>
          </div>
          {/* Weaknesses */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-destructive font-heading-bn">{t('দুর্বলতা', 'Weaknesses')}</h4>
            <div className="flex flex-wrap gap-1.5">
              {ai?.weaknesses?.map((w, i) => (
                <span key={i} className="text-xs bg-destructive/10 text-destructive rounded-full px-2.5 py-1">{w}</span>
              ))}
            </div>
          </div>
          {/* Patterns */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-[hsl(var(--brand-purple))] font-heading-bn">{t('প্যাটার্ন', 'Patterns')}</h4>
            <div className="flex flex-wrap gap-1.5">
              {ai?.top_patterns?.map((p, i) => (
                <span key={i} className="text-xs bg-[hsl(var(--brand-purple))]/10 text-[hsl(var(--brand-purple))] rounded-full px-2.5 py-1">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Their Ads */}
      {data.ads_found?.length > 0 && (
        <div className="mb-6">
          <h3 className="font-heading-bn font-bold text-foreground mb-4">{t('📢 তাদের অ্যাডগুলো', '📢 Their Ads')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.ads_found.map((ad: any, i: number) => (
              <div key={i} className="bg-card rounded-2xl shadow-warm p-4 border border-border">
                <span className="text-xs bg-primary/10 text-primary rounded-full px-2.5 py-0.5 font-medium">{ad.page_name}</span>
                {ad.headline && <p className="font-bold text-foreground mt-2 text-sm">{ad.headline}</p>}
                {ad.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{ad.body}</p>}
              </div>
            ))}
          </div>
          <button onClick={onCreateAd} className="mt-3 text-sm text-primary font-semibold flex items-center gap-1 hover:underline">
            {t('এই ধরনের বিজ্ঞাপন তৈরি করুন', 'Create ads like these')} <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Section 3: Counter Strategies */}
      {data.counter_strategies?.length > 0 && (
        <div className="mb-6">
          <h3 className="font-heading-bn font-bold text-foreground mb-4">{t('⚔️ কাউন্টার স্ট্র্যাটেজি', '⚔️ Counter Strategies')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.counter_strategies.map((cs: any, i: number) => (
              <div key={i} className="bg-card rounded-2xl shadow-warm p-5 border-2 border-primary/30">
                <div className="flex items-center gap-2 mb-2"><Swords className="text-primary" size={16} /><h4 className="font-bold text-foreground text-sm">{cs.title}</h4></div>
                <p className="text-xs text-muted-foreground mb-3 font-body-bn">{cs.description}</p>
                <div className="bg-primary/5 rounded-xl p-3 mb-3">
                  <p className="text-[10px] text-muted-foreground mb-1">{t('উদাহরণ হুক:', 'Example hook:')}</p>
                  <p className="text-xs font-medium text-foreground font-body-bn">"{cs.example_hook}"</p>
                </div>
                <button
                  onClick={() => { copyText(cs.example_hook); onCreateAd(); }}
                  className="w-full text-xs bg-primary/10 text-primary rounded-lg py-2 font-semibold hover:bg-primary/20 transition-colors"
                >
                  {t('এই স্ট্র্যাটেজি দিয়ে বিজ্ঞাপন তৈরি করুন', 'Create ad with this strategy')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Comparison Table */}
      {showComparison && (
        <div className="mb-6">
          <h3 className="font-heading-bn font-bold text-foreground mb-4">{t('📊 প্রতিযোগী তুলনা', '📊 Competitor Comparison')}</h3>
          <div className="bg-card rounded-2xl shadow-warm overflow-x-auto border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium">{t('মেট্রিক', 'Metric')}</th>
                  {uniqueCompetitors.slice(0, 5).map(c => (
                    <th key={c.id} className="text-left p-3 text-foreground font-bold">{c.competitor_name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="p-3 text-muted-foreground">{t('অ্যাড সংখ্যা', 'Ads Found')}</td>
                  {uniqueCompetitors.slice(0, 5).map(c => (
                    <td key={c.id} className="p-3 font-bold text-foreground">{lang === 'bn' ? toBanglaNum(c.ads_count) : c.ads_count}</td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="p-3 text-muted-foreground">{t('প্যাটার্ন', 'Patterns')}</td>
                  {uniqueCompetitors.slice(0, 5).map(c => (
                    <td key={c.id} className="p-3 text-xs text-muted-foreground">{c.top_patterns.slice(0, 2).join(', ').slice(0, 40) || '—'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 text-muted-foreground">{t('শেষ বিশ্লেষণ', 'Last Analyzed')}</td>
                  {uniqueCompetitors.slice(0, 5).map(c => (
                    <td key={c.id} className="p-3 text-xs text-muted-foreground">{relativeTime(c.created_at, lang)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorIntel;
