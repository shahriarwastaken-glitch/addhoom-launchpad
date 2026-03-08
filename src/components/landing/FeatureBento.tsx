import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { motion } from 'framer-motion';

const features = [
  { span: 2, accent: 'border-t-primary', emoji: '🎬', badge: '', title: { bn: 'AI ভিডিও বিজ্ঞাপন জেনারেটর', en: 'AI Video Ad Generator' }, desc: { bn: 'পণ্যের ছবি দিন — AI ভিডিও অ্যাড তৈরি করবে। Reels, TikTok, YouTube Shorts সব ফরম্যাটে।', en: 'Give product images — AI creates video ads in all formats.' }, subs: ['Auto captions', 'AI voiceover', 'Multiple formats', 'Scroll-stopping hooks'], link: { bn: 'ভিডিও তৈরি করুন →', en: 'Create Video →' } },
  { span: 1, accent: 'border-t-brand-green', emoji: '⚡', badge: '', title: { bn: 'ধুম স্কোর', en: 'Dhoom Score' }, desc: { bn: 'লঞ্চের আগেই জানুন কোন বিজ্ঞাপন চলবে', en: 'Know which ad will work before launch' }, subs: null, link: null },
  { span: 1, accent: 'border-t-primary', emoji: '🔗', badge: '', title: { bn: 'লিংক থেকে বিজ্ঞাপন', en: 'Link to Ad' }, desc: { bn: 'Daraz, Facebook Shop, যেকোনো লিংক পেস্ট করুন', en: 'Paste any link — AI generates ads' }, subs: null, link: null },
  { span: 1, accent: 'border-t-brand-purple', emoji: '🧬', badge: '', title: { bn: 'শপ DNA', en: 'Shop DNA' }, desc: { bn: 'একবার সেটআপ করুন। AI আপনার শপের কণ্ঠস্বর মনে রাখবে।', en: 'Set up once. AI remembers your voice.' }, subs: null, link: null },
  { span: 1, accent: 'border-t-primary', emoji: '📅', badge: '', title: { bn: 'কনটেন্ট ক্যালেন্ডার', en: 'Content Calendar' }, desc: { bn: '৩ মাসের কনটেন্ট প্ল্যান একবারে তৈরি', en: '3-month content plan in one go' }, subs: null, link: null },
  { span: 1, accent: 'border-t-brand-purple', emoji: '🔍', badge: '', title: { bn: 'প্রতিযোগী গোয়েন্দা', en: 'Competitor Intel' }, desc: { bn: 'প্রতিযোগীর অ্যাড দেখুন। তাদের চেয়ে ভালো করুন।', en: "See competitor ads. Do better." }, subs: null, link: null },
  { span: 1, accent: 'border-t-brand-green', emoji: '🩺', badge: '', title: { bn: 'অ্যাকাউন্ট ডাক্তার', en: 'Account Doctor' }, desc: { bn: 'সাপ্তাহিক অ্যাকাউন্ট হেলথ রিপোর্ট', en: 'Weekly account health report' }, subs: null, link: null },
  { span: 2, accent: 'border-t-brand-yellow', emoji: '🎉', badge: 'NEW', title: { bn: 'উৎসব টেমপ্লেট', en: 'Festival Templates' }, desc: { bn: 'রেডিমেড ক্যাম্পেইন। ঈদের ২ সপ্তাহ আগেই লঞ্চ করুন।', en: 'Ready-made campaigns. Launch 2 weeks before Eid.' }, subs: null, link: null, icons: '🕌 🎭 🪔 🇧🇩' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const FeatureBento = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();

  return (
    <section ref={ref} id="features" className="py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <span className="section-label">{t('ফিচারসমূহ', 'Features')}</span>
          <h2 className="mt-3 font-heading-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}>
            {t('আপনার পুরো AI মার্কেটিং টিম', 'Your Complete AI Marketing Team')}
          </h2>
          <p className="mt-3 text-muted-foreground font-body-bn max-w-xl mx-auto">
            {t('বিশ্বের সেরা মার্কেটিং টুলের সব ফিচার — বাংলাদেশের জন্য', 'World-class marketing features — built for Bangladesh')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate={isVisible ? 'visible' : 'hidden'}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`${f.span === 2 ? 'md:col-span-2' : ''} bg-card rounded-3xl p-6 shadow-warm border-t-4 ${f.accent} cursor-default`}
            >
              {f.badge && <span className="inline-block bg-brand-yellow text-foreground text-xs font-bold rounded-full px-2 py-0.5 mb-2">{f.badge}</span>}
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="text-lg font-heading-bn font-bold text-foreground mb-2">{t(f.title.bn, f.title.en)}</h3>
              <p className="text-sm text-muted-foreground font-body-bn mb-3">{t(f.desc.bn, f.desc.en)}</p>
              {f.subs && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {f.subs.map(s => <span key={s} className="text-xs bg-secondary rounded-full px-2.5 py-1 text-muted-foreground">{s}</span>)}
                </div>
              )}
              {'icons' in f && f.icons && <div className="text-2xl tracking-widest mb-2">{f.icons}</div>}
              {f.link && <a href="#" className="text-sm font-semibold text-primary hover:underline">{t(f.link.bn, f.link.en)}</a>}
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <a href="#" className="text-primary font-semibold hover:underline font-body-bn">{t('সব ফিচার দেখুন →', 'See All Features →')}</a>
        </div>
      </div>
    </section>
  );
};

export default FeatureBento;
