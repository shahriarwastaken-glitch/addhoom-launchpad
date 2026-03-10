import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { motion } from 'framer-motion';
import { XCircle, CheckCircle2 } from 'lucide-react';

const rows = [
  { feature: { bn: 'ক্যাম্পেইন সেটআপ', en: 'Campaign Setup' }, without: { bn: '৪–৬ ঘণ্টা', en: '4-6 hours' }, with_: { bn: '৫ মিনিট', en: '5 minutes' }, gain: { bn: '৫০x দ্রুত', en: '50x faster' } },
  { feature: { bn: 'বিজ্ঞাপন কপি', en: 'Ad Copy' }, without: { bn: 'ফ্রিল্যান্সার ৳৩,০০০+', en: 'Freelancer ৳3,000+' }, with_: { bn: 'AI তাৎক্ষণিক', en: 'AI Instant' }, gain: { bn: '১০০% সাশ্রয়', en: '100% saved' } },
  { feature: { bn: 'ভিডিও অ্যাড', en: 'Video Ads' }, without: { bn: 'প্রোডাকশন ৳২০,০০০+', en: 'Production ৳20,000+' }, with_: { bn: 'পণ্যের ছবি থেকে AI', en: 'AI from product photos' }, gain: { bn: 'ইনক্লুডেড', en: 'Included' } },
  { feature: { bn: 'ঈদ ক্যাম্পেইন', en: 'Eid Campaign' }, without: { bn: 'এজেন্সি ৳১৫,০০০', en: 'Agency ৳15,000' }, with_: { bn: 'রেডিমেড টেমপ্লেট', en: 'Ready template' }, gain: { bn: 'ইনক্লুডেড', en: 'Included' } },
  { feature: { bn: 'পারফরম্যান্স প্রেডিকশন', en: 'Prediction' }, without: { bn: 'অনুমান', en: 'Guesswork' }, with_: { bn: 'ধুম স্কোর ৯০%+', en: 'Dhoom Score 90%+' }, gain: { bn: 'তাৎক্ষণিক', en: 'Instant' } },
  { feature: { bn: 'প্রতিযোগী বিশ্লেষণ', en: 'Competitor Analysis' }, without: { bn: 'ঘণ্টার পর ঘণ্টা', en: 'Hours of work' }, with_: { bn: '১ ক্লিকে', en: '1 click' }, gain: { bn: 'তাৎক্ষণিক', en: 'Instant' } },
];

const BeforeAfter = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();

  return (
    <section ref={ref} id="why-us" className="py-24 px-4 bg-secondary">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <span className="section-label">{t('পার্থক্য দেখুন', 'See the Difference')}</span>
          <h2 className="mt-3 font-heading-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>
            {t('AdDhoom ছাড়া বনাম AdDhoom দিয়ে', 'Without vs With AdDhoom')}
          </h2>
        </div>
        {/* Desktop table */}
        <motion.div
          className="hidden md:block bg-card rounded-[20px] shadow-warm-lg"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 text-left font-heading-bn font-semibold text-foreground">{t('ফিচার', 'Feature')}</th>
                <th className="p-4 text-left font-heading-bn font-semibold text-foreground"><span className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-destructive" /> {t('AdDhoom ছাড়া', 'Without AdDhoom')}</span></th>
                <th className="p-4 text-left font-heading-bn font-semibold text-foreground"><span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-brand-green" /> {t('AdDhoom দিয়ে', 'With AdDhoom')}</span></th>
                <th className="p-4 text-left font-heading-bn font-semibold text-foreground">{t('পার্থক্য', 'Gain')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <motion.tr key={i} className="border-b border-border last:border-0 hover:bg-brand-yellow/5 transition-colors"
                  initial={{ opacity: 0, x: -20 }} animate={isVisible ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.1 + i * 0.08 }}>
                  <td className="p-4 font-semibold text-foreground font-body-bn">{t(row.feature.bn, row.feature.en)}</td>
                  <td className="p-4 bg-destructive/5 text-foreground font-body-bn">{t(row.without.bn, row.without.en)}</td>
                  <td className="p-4 bg-brand-green/5 text-foreground font-body-bn">{t(row.with_.bn, row.with_.en)}</td>
                  <td className="p-4"><span className="bg-primary/10 text-primary text-xs font-bold rounded-full px-3 py-1">{t(row.gain.bn, row.gain.en)}</span></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4">
          {rows.map((row, i) => (
            <motion.div
              key={i}
              className="bg-card rounded-2xl shadow-warm p-4 space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.08 }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground font-body-bn">{t(row.feature.bn, row.feature.en)}</span>
                <span className="bg-primary/10 text-primary text-xs font-bold rounded-full px-3 py-1">{t(row.gain.bn, row.gain.en)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-destructive/5 rounded-xl p-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1"><XCircle className="w-3 h-3 text-destructive" /> {t('ছাড়া', 'Without')}</span>
                  <span className="text-foreground font-body-bn">{t(row.without.bn, row.without.en)}</span>
                </div>
                <div className="bg-brand-green/5 rounded-xl p-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1"><CheckCircle2 className="w-3 h-3 text-brand-green" /> {t('দিয়ে', 'With')}</span>
                  <span className="text-foreground font-body-bn">{t(row.with_.bn, row.with_.en)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BeforeAfter;
