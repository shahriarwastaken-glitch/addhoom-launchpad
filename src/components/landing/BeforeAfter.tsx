import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const rows = [
  { feature: { bn: 'ক্যাম্পেইন সেটআপ', en: 'Campaign Setup' }, without: { bn: '৪–৬ ঘণ্টা', en: '4-6 hours' }, with_: { bn: '৫ মিনিট', en: '5 minutes' }, gain: { bn: '৫০x দ্রুত', en: '50x faster' } },
  { feature: { bn: 'বিজ্ঞাপন কপি', en: 'Ad Copy' }, without: { bn: 'ফ্রিল্যান্সার ৳৩,০০০+', en: 'Freelancer ৳3,000+' }, with_: { bn: 'AI তাৎক্ষণিক', en: 'AI Instant' }, gain: { bn: '১০০% সাশ্রয়', en: '100% saved' } },
  { feature: { bn: 'ভিডিও অ্যাড', en: 'Video Ads' }, without: { bn: 'প্রোডাকশন ৳২০,০০০+', en: 'Production ৳20,000+' }, with_: { bn: 'ছবি থেকে AI', en: 'AI from images' }, gain: { bn: 'ইনক্লুডেড', en: 'Included' } },
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
          <h2 className="mt-3 font-heading-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}>
            {t('AdDhoom ছাড়া বনাম AdDhoom দিয়ে', 'Without vs With AdDhoom')}
          </h2>
        </div>
        <div className={`bg-card rounded-[20px] shadow-warm-lg overflow-x-auto transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 text-left font-heading-bn font-semibold text-foreground">{t('ফিচার', 'Feature')}</th>
                <th className="p-4 text-left font-heading-bn font-semibold text-foreground">{t('ছাড়া', 'Without')} 🔴</th>
                <th className="p-4 text-left font-heading-bn font-semibold text-foreground">{t('দিয়ে', 'With')} 🟢</th>
                <th className="p-4 text-left font-heading-bn font-semibold text-foreground">{t('পার্থক্য', 'Gain')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-brand-yellow/5 transition-colors">
                  <td className="p-4 font-semibold text-foreground font-body-bn">{t(row.feature.bn, row.feature.en)}</td>
                  <td className="p-4 bg-destructive/5 text-foreground font-body-bn">{t(row.without.bn, row.without.en)}</td>
                  <td className="p-4 bg-brand-green/5 text-foreground font-body-bn">{t(row.with_.bn, row.with_.en)}</td>
                  <td className="p-4"><span className="bg-primary/10 text-primary text-xs font-bold rounded-full px-3 py-1">{t(row.gain.bn, row.gain.en)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default BeforeAfter;
