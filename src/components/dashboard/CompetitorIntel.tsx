import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

const CompetitorIntel = () => {
  const { t } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [url, setUrl] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    if (!activeWorkspace) {
      toast.error(t('প্রথমে একটি শপ তৈরি করুন', 'Please create a shop first'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.competitorIntel({
        workspace_id: activeWorkspace.id,
        competitor_url: url,
        competitor_name: competitorName || undefined,
      });

      if (response.error) {
        toast.error(t(response.error.message_bn, response.error.message_en));
      } else if (response.data) {
        setAnalysis(response.data.analysis || response.data);
        toast.success(t('বিশ্লেষণ সম্পন্ন!', 'Analysis complete!'));
      }
    } catch {
      toast.error(t('বিশ্লেষণ ব্যর্থ হয়েছে', 'Analysis failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-heading-bn font-bold text-foreground mb-8">
        {t('🔍 প্রতিযোগী গোয়েন্দা', '🔍 Competitor Intel')}
      </h2>

      <div className="bg-card rounded-[20px] shadow-warm p-8 space-y-4">
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
        <input
          value={competitorName}
          onChange={e => setCompetitorName(e.target.value)}
          placeholder={t('প্রতিযোগীর নাম (ঐচ্ছিক)', 'Competitor name (optional)')}
          className="w-full p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-bn"
        />
      </div>

      {analysis && (
        <div className="mt-8 space-y-6 animate-fade-up">
          {/* AI Analysis */}
          {analysis.ai_analysis && (
            <div className="bg-card rounded-[20px] shadow-warm p-6 border-2 border-primary/20">
              <h3 className="font-heading-bn font-bold text-foreground mb-3">{t('🧠 AI বিশ্লেষণ', '🧠 AI Analysis')}</h3>
              <p className="text-sm text-muted-foreground font-body-bn whitespace-pre-wrap">{analysis.ai_analysis}</p>
            </div>
          )}

          {/* Counter Strategy */}
          {analysis.counter_strategy && (
            <div className="bg-card rounded-[20px] shadow-warm p-6 border-2 border-brand-green/20">
              <h3 className="font-heading-bn font-bold text-foreground mb-3">{t('⚔️ কাউন্টার স্ট্র্যাটেজি', '⚔️ Counter Strategy')}</h3>
              <p className="text-sm text-muted-foreground font-body-bn whitespace-pre-wrap">{analysis.counter_strategy}</p>
            </div>
          )}

          {/* Found Ads */}
          {analysis.ads_found && Array.isArray(analysis.ads_found) && analysis.ads_found.length > 0 && (
            <div>
              <h3 className="font-heading-bn font-bold text-foreground mb-4">{t('সক্রিয় বিজ্ঞাপন', 'Active Ads')}</h3>
              <div className="grid gap-4">
                {analysis.ads_found.map((ad: any, i: number) => (
                  <div key={i} className="bg-card rounded-2xl shadow-warm p-5 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-heading-bn font-bold text-foreground">{ad.headline || ad.title || `Ad ${i + 1}`}</p>
                      {ad.body && <p className="text-sm text-muted-foreground mt-1">{ad.body}</p>}
                      <div className="flex gap-3 mt-2">
                        {ad.framework && <span className="text-xs bg-primary/10 text-primary rounded px-2 py-0.5">{ad.framework}</span>}
                        {ad.platform && <span className="text-xs bg-secondary rounded px-2 py-0.5 text-muted-foreground">{ad.platform}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompetitorIntel;
