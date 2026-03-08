import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Search, CheckCircle, XCircle, Swords, ChevronDown, ChevronUp, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Ad = {
  page_name: string;
  headline: string;
  body: string;
  caption: string;
  running_since: string;
};

type CounterStrategy = {
  title: string;
  description: string;
  example_hook: string;
};

type Analysis = {
  strategy_type: string;
  strengths: string[];
  weaknesses: string[];
  top_patterns: string[];
  counter_strategies: CounterStrategy[];
  ads_analyzed: number;
};

const CompetitorIntel = () => {
  const { t } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [competitorName, setCompetitorName] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [expandedAd, setExpandedAd] = useState<number | null>(null);

  const handleAnalyze = async () => {
    if (!competitorName.trim()) return;
    if (!activeWorkspace) {
      toast.error(t('প্রথমে একটি শপ তৈরি করুন', 'Please create a shop first'));
      return;
    }

    setLoading(true);
    setAnalysis(null);
    setAds([]);
    try {
      const response = await api.competitorIntel({
        workspace_id: activeWorkspace.id,
        competitor_name: competitorName,
        competitor_page_url: pageUrl || undefined,
      });

      if (response.error) {
        toast.error(t(response.error.message_bn, response.error.message_en));
      } else if (response.data) {
        setAnalysis(response.data.analysis);
        setAds(response.data.ads || []);
        toast.success(t('বিশ্লেষণ সম্পন্ন!', 'Analysis complete!'));
      }
    } catch {
      toast.error(t('বিশ্লেষণ ব্যর্থ হয়েছে', 'Analysis failed'));
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('কপি হয়েছে!', 'Copied!'));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-heading-bn font-bold text-foreground mb-6">
        {t('🔍 প্রতিযোগী গোয়েন্দা', '🔍 Competitor Intel')}
      </h2>

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
            onClick={handleAnalyze}
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

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-up">
          <Loader2 className="animate-spin text-primary mb-4" size={48} />
          <p className="font-body-bn text-muted-foreground text-lg">
            {t('প্রতিযোগীর বিজ্ঞাপন বিশ্লেষণ হচ্ছে...', 'Analyzing competitor ads...')}
          </p>
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
          {/* LEFT — Their Ads */}
          <div className="space-y-4">
            <h3 className="font-heading-bn font-bold text-foreground text-lg">
              {t(`📢 তাদের বিজ্ঞাপন (${ads.length}টি পাওয়া গেছে)`, `📢 Their Ads (${ads.length} found)`)}
            </h3>

            {ads.length === 0 ? (
              <div className="bg-card rounded-[20px] shadow-warm p-6 text-center">
                <p className="text-muted-foreground font-body-bn">
                  {t('কোনো সক্রিয় বিজ্ঞাপন পাওয়া যায়নি। AI ভিত্তিক বিশ্লেষণ দেখুন →', 'No active ads found. See AI-based analysis →')}
                </p>
              </div>
            ) : (
              ads.map((ad, i) => (
                <div key={i} className="bg-card rounded-2xl shadow-warm p-5 border border-border hover:border-primary/30 transition-colors">
                  {/* Page name badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1 font-medium">
                      {ad.page_name}
                    </span>
                    {ad.running_since && (
                      <span className="text-xs text-muted-foreground">
                        {t('চলছে:', 'Running:')} {new Date(ad.running_since).toLocaleDateString('bn-BD')}
                      </span>
                    )}
                  </div>

                  {/* Headline */}
                  {ad.headline && (
                    <p className="font-heading-bn font-bold text-foreground mb-1">{ad.headline}</p>
                  )}

                  {/* Body — truncated with expand */}
                  {ad.body && (
                    <div>
                      <p className={`text-sm text-muted-foreground font-body-bn ${expandedAd !== i ? 'line-clamp-3' : ''}`}>
                        {ad.body}
                      </p>
                      {ad.body.length > 150 && (
                        <button
                          onClick={() => setExpandedAd(expandedAd === i ? null : i)}
                          className="text-xs text-primary mt-1 flex items-center gap-1"
                        >
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
            {/* Strategy Type */}
            <div className="bg-card rounded-[20px] shadow-warm p-6 border-2 border-primary/20">
              <h3 className="font-heading-bn font-bold text-foreground mb-2">
                {t('🎯 তাদের স্ট্র্যাটেজি', '🎯 Their Strategy')}
              </h3>
              <span className="inline-block bg-primary/10 text-primary font-bold rounded-full px-4 py-2 text-sm font-body-bn">
                {analysis.strategy_type}
              </span>
            </div>

            {/* Strengths */}
            {analysis.strengths?.length > 0 && (
              <div className="bg-card rounded-[20px] shadow-warm p-6">
                <h3 className="font-heading-bn font-bold text-foreground mb-3">
                  {t('✅ তাদের শক্তি', '✅ Their Strengths')}
                </h3>
                <ul className="space-y-2">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="text-green-500 mt-0.5 shrink-0" size={16} />
                      <span className="text-sm text-muted-foreground font-body-bn">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {analysis.weaknesses?.length > 0 && (
              <div className="bg-card rounded-[20px] shadow-warm p-6">
                <h3 className="font-heading-bn font-bold text-foreground mb-3">
                  {t('❌ তাদের দুর্বলতা', '❌ Their Weaknesses')}
                </h3>
                <ul className="space-y-2">
                  {analysis.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <XCircle className="text-destructive mt-0.5 shrink-0" size={16} />
                      <span className="text-sm text-muted-foreground font-body-bn">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top Patterns */}
            {analysis.top_patterns?.length > 0 && (
              <div className="bg-card rounded-[20px] shadow-warm p-6">
                <h3 className="font-heading-bn font-bold text-foreground mb-3">
                  {t('📊 শীর্ষ প্যাটার্ন', '📊 Top Patterns')}
                </h3>
                <ol className="space-y-2 list-decimal list-inside">
                  {analysis.top_patterns.map((p, i) => (
                    <li key={i} className="text-sm text-muted-foreground font-body-bn">{p}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Counter Strategies */}
            {analysis.counter_strategies?.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-heading-bn font-bold text-foreground text-lg">
                  {t('⚔️ কাউন্টার স্ট্র্যাটেজি', '⚔️ Counter Strategies')}
                </h3>
                {analysis.counter_strategies.map((cs, i) => (
                  <div key={i} className="bg-card rounded-[20px] shadow-warm p-6 border-2 border-primary/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Swords className="text-primary" size={18} />
                      <h4 className="font-heading-bn font-bold text-foreground">{cs.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground font-body-bn mb-3">{cs.description}</p>

                    {/* Example hook */}
                    <div className="bg-primary/5 rounded-xl p-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t('উদাহরণ হুক:', 'Example hook:')}</p>
                        <p className="text-sm font-medium text-foreground font-body-bn">"{cs.example_hook}"</p>
                      </div>
                      <button
                        onClick={() => copyText(cs.example_hook)}
                        className="shrink-0 p-2 rounded-lg hover:bg-primary/10 transition-colors"
                      >
                        <Copy size={14} className="text-primary" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorIntel;
