import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { PartyPopper, Sparkles, Loader2, Moon, Drama, Flame, Flag, Zap, ClipboardCopy } from 'lucide-react';
import { toast } from 'sonner';

const festivals = [
  { id: 'eid', icon: Moon, bn: 'ঈদ ক্যাম্পেইন', en: 'Eid Campaign', descBn: 'ঈদুল ফিতর ও ঈদুল আযহার জন্য রেডিমেড টেমপ্লেট।', descEn: 'Ready-made templates for Eid.', gradient: 'from-[hsl(19,100%,50%)] to-[hsl(43,100%,50%)]' },
  { id: 'boishakh', icon: Drama, bn: 'পহেলা বৈশাখ', en: 'Pohela Boishakh', descBn: 'বাংলা নববর্ষের জন্য বিশেষ ক্যাম্পেইন।', descEn: 'Bengali New Year campaigns.', gradient: 'from-[hsl(43,100%,50%)] to-[hsl(19,100%,62%)]' },
  { id: 'puja', icon: Flame, bn: 'দুর্গাপূজা', en: 'Durga Puja', descBn: 'পূজার মৌসুমে বিক্রি বাড়ান।', descEn: 'Boost sales during Puja.', gradient: 'from-[hsl(253,79%,58%)] to-[hsl(280,80%,65%)]' },
  { id: 'victory', icon: Flag, bn: '১৬ ডিসেম্বর', en: '16 December', descBn: 'বিজয় দিবসের বিশেষ ক্যাম্পেইন।', descEn: 'Victory Day campaigns.', gradient: 'from-[hsl(155,100%,36%)] to-[hsl(155,100%,42%)]' },
];

const FestivalTemplates = () => {
  const { t } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatedAds, setGeneratedAds] = useState<Record<string, any[]>>({});

  const generateForFestival = async (festivalId: string, festivalName: string) => {
    if (!activeWorkspace) {
      toast.error(t('প্রথমে একটি শপ তৈরি করুন', 'Please create a shop first'));
      return;
    }

    setGeneratingId(festivalId);
    try {
      const response = await api.generateAds({
        workspace_id: activeWorkspace.id,
        product_name: activeWorkspace.shop_name || 'My Products',
        occasion: festivalId,
        platform: ['Facebook', 'Instagram'],
        language: 'bn',
        num_variations: 3,
        tone: 'festive',
      });

      if (response.error) {
        toast.error(t(response.error.message_bn, response.error.message_en));
      } else if (response.data?.ads) {
        setGeneratedAds(prev => ({ ...prev, [festivalId]: response.data!.ads }));
        toast.success(t(`${festivalName} টেমপ্লেট তৈরি হয়েছে!`, `${festivalName} templates generated!`));
      }
    } catch {
      toast.error(t('টেমপ্লেট তৈরি ব্যর্থ', 'Template generation failed'));
    } finally {
      setGeneratingId(null);
    }
  };

  const copyAd = (ad: any) => {
    navigator.clipboard.writeText(`${ad.headline}\n\n${ad.body}\n\n${ad.cta}`);
    toast.success(t('কপি হয়েছে!', 'Copied!'));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-heading-bn flex items-center gap-2">
          <PartyPopper className="text-primary" size={28} />
          {t('উৎসব টেমপ্লেট', 'Festival Templates')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('AI দিয়ে উৎসবের ক্যাম্পেইন তৈরি করুন।', 'Generate festival campaigns with AI.')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {festivals.map((f, i) => (
          <motion.div key={f.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-card rounded-2xl shadow-warm border border-border overflow-hidden">
            <div className={`bg-gradient-to-r ${f.gradient} p-5 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <f.icon size={28} />
                  <div>
                    <h3 className="text-lg font-bold">{t(f.bn, f.en)}</h3>
                  </div>
                </div>
                <Sparkles size={20} className="opacity-60" />
              </div>
              <p className="text-sm mt-3 opacity-90">{t(f.descBn, f.descEn)}</p>
            </div>
            <div className="p-4">
              {generatedAds[f.id] ? (
                <div className="space-y-2">
                  {generatedAds[f.id].map((ad: any, j: number) => (
                    <div key={j} className="p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary">{ad.platform}</span>
                        <span className="text-xs font-mono text-brand-green">{ad.dhoom_score}/100</span>
                      </div>
                      <p className="text-sm font-semibold">{ad.headline}</p>
                      <p className="text-xs text-muted-foreground mt-1">{ad.body?.slice(0, 80)}...</p>
                      <button onClick={() => copyAd(ad)} className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"><ClipboardCopy size={12} /> {t('কপি', 'Copy')}</button>
                    </div>
                  ))}
                </div>
              ) : (
                <button onClick={() => generateForFestival(f.id, t(f.bn, f.en))} disabled={generatingId === f.id}
                  className="w-full text-sm font-semibold text-primary hover:bg-primary/5 rounded-xl py-3 transition-colors flex items-center justify-center gap-2">
                  {generatingId === f.id ? (
                    <><Loader2 size={14} className="animate-spin" /> {t('তৈরি হচ্ছে...', 'Generating...')}</>
                  ) : (
                    <>{t('⚡ AI টেমপ্লেট তৈরি করুন', '⚡ Generate AI Templates')}</>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FestivalTemplates;
