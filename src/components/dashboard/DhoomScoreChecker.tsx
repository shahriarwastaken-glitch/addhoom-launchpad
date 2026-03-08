import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Check, AlertTriangle, Copy, Sparkles, ChevronDown } from 'lucide-react';

interface Evaluation {
  dhoom_score: number;
  copy_score: number;
  grade: string;
  scores: {
    hook_strength: number;
    bengali_authenticity: number;
    framework_execution: number;
    cta_strength: number;
    mobile_readability: number;
    bd_market_fit: number;
  };
  identified_framework: string;
  what_works: string[];
  what_to_improve: string[];
  improved_headline: string;
  improved_cta: string;
}

const gradeColors: Record<string, string> = {
  S: 'from-yellow-400 to-amber-500',
  A: 'from-emerald-400 to-green-500',
  B: 'from-teal-400 to-cyan-500',
  C: 'from-yellow-400 to-yellow-500',
  D: 'from-orange-400 to-orange-500',
  F: 'from-red-400 to-red-500',
};

const gradeTextColors: Record<string, string> = {
  S: 'text-amber-500', A: 'text-green-500', B: 'text-teal-500',
  C: 'text-yellow-500', D: 'text-orange-500', F: 'text-red-500',
};

const dimensionLabels: Record<string, { bn: string; en: string }> = {
  hook_strength: { bn: 'হুক শক্তি', en: 'Hook Strength' },
  bengali_authenticity: { bn: 'বাংলা স্বাভাবিকতা', en: 'Bengali Authenticity' },
  framework_execution: { bn: 'ফ্রেমওয়ার্ক', en: 'Framework' },
  cta_strength: { bn: 'CTA শক্তি', en: 'CTA Strength' },
  mobile_readability: { bn: 'মোবাইল রিডেবিলিটি', en: 'Mobile Readability' },
  bd_market_fit: { bn: 'BD মার্কেট ফিট', en: 'BD Market Fit' },
};

function scoreColor(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

const DhoomScoreChecker = () => {
  const { t } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [cta, setCta] = useState('');
  const [platform, setPlatform] = useState('facebook');
  const [language, setLanguage] = useState('bn');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Evaluation | null>(null);

  const handleEvaluate = async () => {
    if (!headline && !body) {
      toast.error(t('হেডলাইন বা বডি দিন', 'Provide headline or body'));
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-ad', {
        body: {
          headline, body, cta, platform, language,
          workspace_id: activeWorkspace?.id,
        },
      });
      if (error) throw error;
      if (data?.success) {
        setResult(data.evaluation);
        toast.success(data.message);
      } else {
        toast.error(data?.message_bn || data?.message || 'Error');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('কপি হয়েছে', 'Copied'));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-0">
      <div>
        <h1 className="text-2xl font-bold font-heading-bn flex items-center gap-2">
          <Zap className="text-primary" /> {t('ধুম স্কোর চেক করুন', 'Dhoom Score Checker')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('যেকোনো অ্যাড কপি পেস্ট করুন — বিস্তারিত স্কোর ও উন্নতির পরামর্শ পান', 'Paste any ad copy to get a detailed score and improvement suggestions')}
        </p>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">{t('হেডলাইন', 'Headline')}</label>
            <input
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              placeholder={t('আপনার অ্যাডের হেডলাইন...', 'Your ad headline...')}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('বডি কপি', 'Body Copy')}</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder={t('অ্যাডের মূল টেক্সট...', 'Main ad text...')}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">CTA</label>
            <input
              value={cta}
              onChange={e => setCta(e.target.value)}
              placeholder={t('এখনই অর্ডার করুন', 'Order Now')}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">{t('প্ল্যাটফর্ম', 'Platform')}</label>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="google">Google</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">{t('ভাষা', 'Language')}</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="bn">বাংলা</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleEvaluate}
            disabled={loading || (!headline && !body)}
            className="w-full bg-gradient-cta text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Sparkles size={18} />
                </motion.div>
                {t('বিশ্লেষণ হচ্ছে...', 'Analyzing...')}
              </>
            ) : (
              <>{t('স্কোর দেখুন', 'Check Score')} <Sparkles size={14} /></>
            )}
          </button>
        </div>

        {/* Results Panel */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Grade Badge */}
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
                  className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${gradeColors[result.grade] || gradeColors.C} flex items-center justify-center shadow-lg`}
                >
                  <span className="text-4xl font-black text-white">{result.grade}</span>
                </motion.div>
                <div className="flex-1 space-y-3">
                  {/* Dhoom Score circular */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold">{t('ধুম স্কোর', 'Dhoom Score')}</span>
                      <span className={`font-bold ${gradeTextColors[result.grade] || ''}`}>{result.dhoom_score}</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.dhoom_score}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className={`h-full rounded-full ${scoreColor(result.dhoom_score)}`}
                      />
                    </div>
                  </div>
                  {/* Copy Score */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold">{t('কপি স্কোর', 'Copy Score')}</span>
                      <span className="font-bold">{result.copy_score}</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.copy_score}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className={`h-full rounded-full ${scoreColor(result.copy_score)}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Framework pill */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {result.identified_framework}
                </span>
              </div>

              {/* 6 Dimension bars */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold">{t('বিস্তারিত স্কোর', 'Detailed Scores')}</h3>
                {Object.entries(result.scores).map(([key, value], i) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{t(dimensionLabels[key]?.bn || key, dimensionLabels[key]?.en || key)}</span>
                      <span className="font-bold">{value}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                        className={`h-full rounded-full ${scoreColor(value)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* What works */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-bold text-emerald-600 flex items-center gap-1 mb-2">
                  <Check size={14} /> {t('কী ভালো আছে', 'What Works')}
                </h3>
                <ul className="space-y-2">
                  {result.what_works?.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What to improve */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-bold text-primary flex items-center gap-1 mb-2">
                  <AlertTriangle size={14} /> {t('কী উন্নত করবেন', 'What to Improve')}
                </h3>
                <ul className="space-y-2">
                  {result.what_to_improve?.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle size={14} className="text-primary mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improved suggestions */}
              {result.improved_headline && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <h3 className="text-sm font-bold mb-2">{t('উন্নত হেডলাইন', 'Improved Headline')}</h3>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-sm font-medium bg-card rounded-lg px-3 py-2 border border-border">{result.improved_headline}</p>
                    <button onClick={() => copyText(result.improved_headline)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              )}
              {result.improved_cta && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <h3 className="text-sm font-bold mb-2">{t('উন্নত CTA', 'Improved CTA')}</h3>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-sm font-medium bg-card rounded-lg px-3 py-2 border border-border">{result.improved_cta}</p>
                    <button onClick={() => copyText(result.improved_cta)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state when no result */}
        {!result && !loading && (
          <div className="flex items-center justify-center lg:min-h-[400px]">
            <div className="text-center text-muted-foreground">
              <Zap size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">{t('অ্যাড কপি দিন এবং "স্কোর দেখুন" চাপুন', 'Enter ad copy and click "Check Score"')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DhoomScoreChecker;
