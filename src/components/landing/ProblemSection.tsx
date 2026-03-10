import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Frown, Clock, HelpCircle } from 'lucide-react';

const problems = [
  { Icon: Frown, stat: { bn: '৳৫,০০,০০০+', en: '৳5,00,000+' }, title: { bn: 'খারাপ বিজ্ঞাপনে নষ্ট হয়', en: 'Wasted on Bad Ads' }, desc: { bn: 'ব্যবসা শুরুর আগেই বাজেট শেষ।', en: 'Budget runs out before business starts.' } },
  { Icon: Clock, stat: { bn: '৪০+ ঘণ্টা/মাস', en: '40+ hrs/month' }, title: { bn: 'ক্যাম্পেইন ম্যানেজ করতে যায়', en: 'Spent Managing Campaigns' }, desc: { bn: 'দোকান চালানোর সময় নেই।', en: 'No time to run your shop.' } },
  { Icon: HelpCircle, stat: { bn: '৮৭%', en: '87%' }, title: { bn: 'উদ্যোক্তা মনে করেন মার্কেটিং কঠিন', en: 'Find marketing confusing' }, desc: { bn: 'টেকনিক্যাল জ্ঞান ছাড়া কঠিন।', en: 'Hard without technical knowledge.' } },
];

const ProblemSection = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();

  return (
    <section ref={ref} className="py-24 px-4 bg-secondary">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <span className="section-label">{t('সমস্যা', 'The Problem')}</span>
          <h2 className="mt-3 font-heading-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}>
            {t('ছোট শপের মার্কেটিং কঠিন ছিল — এতদিন', 'Small Shop Marketing Was Hard — Until Now')}
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {problems.map((p, i) => (
            <div key={i} className={`bg-card rounded-[20px] p-6 shadow-warm border-l-4 border-destructive transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: `${i * 0.12}s` }}>
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                <p.Icon className="w-6 h-6 text-destructive" />
              </div>
              <div className="font-mono text-2xl font-bold text-foreground mb-1">{t(p.stat.bn, p.stat.en)}</div>
              <h3 className="text-base font-heading-bn font-bold text-foreground mb-2">{t(p.title.bn, p.title.en)}</h3>
              <p className="text-sm text-muted-foreground font-body-bn">{t(p.desc.bn, p.desc.en)}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {[
            { bn: 'ফেসবুক অ্যাড ব্যর্থ', en: 'Facebook Ads Fail' },
            { bn: 'বাজেট শেষ', en: 'Budget Gone' },
            { bn: 'প্রতিযোগীরা এগিয়ে', en: 'Competitors Ahead' },
          ].map(pill => (
            <span key={pill.en} className="text-sm border border-destructive/30 text-destructive rounded-full px-4 py-1.5 font-body-bn">{t(pill.bn, pill.en)}</span>
          ))}
        </div>
        <p className="text-center text-2xl md:text-3xl font-heading-bn font-bold italic text-gradient-brand">
          {t('যদি একটা সহজ সমাধান থাকত?', 'What if there was an easy solution?')}
        </p>
      </div>
    </section>
  );
};

export default ProblemSection;
