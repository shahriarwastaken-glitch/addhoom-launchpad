import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { PartyPopper, Download, Eye, Sparkles } from 'lucide-react';

const festivals = [
  {
    id: 'eid',
    emoji: '🌙',
    bn: 'ঈদ ক্যাম্পেইন',
    en: 'Eid Campaign',
    descBn: 'ঈদুল ফিতর ও ঈদুল আযহার জন্য রেডিমেড টেমপ্লেট। ডিসকাউন্ট, ফ্ল্যাশ সেল, ঈদ স্পেশাল অফার।',
    descEn: 'Ready-made templates for Eid ul-Fitr & Eid ul-Adha. Discounts, flash sales, special offers.',
    templates: 12,
    color: 'brand-orange',
    gradient: 'from-[hsl(19,100%,50%)] to-[hsl(43,100%,50%)]',
  },
  {
    id: 'boishakh',
    emoji: '🎭',
    bn: 'পহেলা বৈশাখ',
    en: 'Pohela Boishakh',
    descBn: 'বাংলা নববর্ষের জন্য বিশেষ ক্যাম্পেইন। ঐতিহ্যবাহী ডিজাইন, উৎসবের রং।',
    descEn: 'Special campaigns for Bengali New Year. Traditional designs, festive colors.',
    templates: 8,
    color: 'brand-yellow',
    gradient: 'from-[hsl(43,100%,50%)] to-[hsl(19,100%,62%)]',
  },
  {
    id: 'puja',
    emoji: '🪔',
    bn: 'দুর্গাপূজা',
    en: 'Durga Puja',
    descBn: 'পূজার মৌসুমে বিক্রি বাড়ান। পূজা স্পেশাল অফার, নতুন কালেকশন লঞ্চ।',
    descEn: 'Boost sales during Puja season. Special offers, new collection launches.',
    templates: 6,
    color: 'brand-purple',
    gradient: 'from-[hsl(253,79%,58%)] to-[hsl(280,80%,65%)]',
  },
  {
    id: 'victory',
    emoji: '🇧🇩',
    bn: '১৬ ডিসেম্বর',
    en: '16 December',
    descBn: 'বিজয় দিবসের বিশেষ ক্যাম্পেইন। দেশপ্রেমের থিম, স্পেশাল ডিসকাউন্ট।',
    descEn: 'Victory Day special campaigns. Patriotic themes, special discounts.',
    templates: 5,
    color: 'brand-green',
    gradient: 'from-[hsl(155,100%,36%)] to-[hsl(155,100%,42%)]',
  },
];

const templatePreviews: Record<string, { titleBn: string; titleEn: string; type: string }[]> = {
  eid: [
    { titleBn: 'ঈদ ফ্ল্যাশ সেল', titleEn: 'Eid Flash Sale', type: 'Facebook' },
    { titleBn: 'ঈদ কালেকশন লঞ্চ', titleEn: 'Eid Collection Launch', type: 'Instagram' },
    { titleBn: 'ঈদ গিফট গাইড', titleEn: 'Eid Gift Guide', type: 'Google' },
    { titleBn: 'লাস্ট মিনিট ঈদ অফার', titleEn: 'Last Minute Eid Offer', type: 'Facebook' },
  ],
  boishakh: [
    { titleBn: 'নববর্ষ সেল', titleEn: 'New Year Sale', type: 'Facebook' },
    { titleBn: 'বৈশাখী কালেকশন', titleEn: 'Boishakh Collection', type: 'Instagram' },
    { titleBn: 'পান্তা-ইলিশ অফার', titleEn: 'Panta-Ilish Offer', type: 'Facebook' },
  ],
  puja: [
    { titleBn: 'পূজা স্পেশাল', titleEn: 'Puja Special', type: 'Facebook' },
    { titleBn: 'নতুন কালেকশন', titleEn: 'New Collection', type: 'Instagram' },
    { titleBn: 'ফেস্টিভ সেল', titleEn: 'Festive Sale', type: 'Google' },
  ],
  victory: [
    { titleBn: 'বিজয় দিবস অফার', titleEn: 'Victory Day Offer', type: 'Facebook' },
    { titleBn: 'দেশের গর্ব সেল', titleEn: 'Pride of Nation Sale', type: 'Instagram' },
  ],
};

const FestivalTemplates = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-heading-bn flex items-center gap-2">
          <PartyPopper className="text-primary" size={28} />
          {t('উৎসব টেমপ্লেট', 'Festival Templates')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('রেডিমেড ক্যাম্পেইন। উৎসবের আগেই লঞ্চ করুন।', 'Ready-made campaigns. Launch before the festival.')}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {festivals.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-2xl shadow-warm border border-border overflow-hidden"
          >
            <div className={`bg-gradient-to-r ${f.gradient} p-5 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{f.emoji}</span>
                  <div>
                    <h3 className="text-lg font-bold">{t(f.bn, f.en)}</h3>
                    <span className="text-xs opacity-80">{f.templates} {t('টেমপ্লেট', 'templates')}</span>
                  </div>
                </div>
                <Sparkles size={20} className="opacity-60" />
              </div>
              <p className="text-sm mt-3 opacity-90 leading-relaxed">{t(f.descBn, f.descEn)}</p>
            </div>
            <div className="p-4 space-y-2">
              {templatePreviews[f.id]?.map((tmpl, j) => (
                <div key={j} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary">{tmpl.type}</span>
                    <span className="text-sm font-medium">{t(tmpl.titleBn, tmpl.titleEn)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                      <Eye size={14} />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button className="w-full mt-2 text-sm font-semibold text-primary hover:underline">
                {t('সব টেমপ্লেট দেখুন →', 'View all templates →')}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FestivalTemplates;
