import { useLanguage } from '@/contexts/LanguageContext';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const AccountDoctor = () => {
  const { t } = useLanguage();
  const score = 74;
  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (score / 100) * circumference;
  const scoreColor = score >= 71 ? 'stroke-brand-green' : score >= 41 ? 'stroke-brand-yellow' : 'stroke-destructive';

  const sections = [
    {
      type: 'good',
      title: { bn: '✅ যা ভালো চলছে', en: '✅ What's Going Well' },
      borderColor: 'border-l-brand-green',
      items: [
        { bn: 'বিজ্ঞাপন কপি কোয়ালিটি উন্নত', en: 'Ad copy quality improved' },
        { bn: 'CTR গত সপ্তাহের চেয়ে ১৫% বেশি', en: 'CTR up 15% from last week' },
      ],
    },
    {
      type: 'warn',
      title: { bn: '⚠️ মনোযোগ দিন', en: '⚠️ Needs Attention' },
      borderColor: 'border-l-brand-yellow',
      items: [
        { bn: 'ভিডিও কনটেন্ট কম — সপ্তাহে ২টি যোগ করুন', en: 'Low video content — add 2 per week' },
        { bn: 'Instagram এনগেজমেন্ট কমছে', en: 'Instagram engagement declining' },
      ],
    },
    {
      type: 'urgent',
      title: { bn: '🔴 এখনই ব্যবস্থা নিন', en: '🔴 Take Action Now' },
      borderColor: 'border-l-destructive',
      items: [
        { bn: 'Facebook পিক্সেল সঠিকভাবে কাজ করছে না', en: 'Facebook Pixel not working properly' },
      ],
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-heading-bn font-bold text-foreground mb-8">
        {t('🩺 অ্যাকাউন্ট ডাক্তার', '🩺 Account Doctor')}
      </h2>

      {/* Health Score */}
      <div className="bg-card rounded-[20px] shadow-warm p-8 text-center mb-8">
        <svg width="200" height="200" className="mx-auto">
          <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--border))" strokeWidth="12" />
          <circle cx="100" cy="100" r="80" fill="none" className={scoreColor} strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
          <text x="100" y="95" textAnchor="middle" className="font-mono font-bold" fontSize="40" fill="currentColor">
            {toBengali(score)}
          </text>
          <text x="100" y="120" textAnchor="middle" className="font-body-bn" fontSize="14" fill="hsl(var(--muted-foreground))">
            {t('হেলথ স্কোর', 'Health Score')}
          </text>
        </svg>
        <p className="text-sm text-muted-foreground mt-4 font-body-bn">
          {t('শেষ আপডেট: আজ সকাল ৯টা', 'Last updated: Today 9 AM')}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section, i) => (
          <div key={i}>
            <h3 className="font-heading-bn font-bold text-foreground mb-3">{t(section.title.bn, section.title.en)}</h3>
            <div className="space-y-3">
              {section.items.map((item, j) => (
                <div key={j} className={`bg-card rounded-xl shadow-warm p-4 border-l-4 ${section.borderColor} flex items-center justify-between`}>
                  <span className="text-sm text-foreground font-body-bn">{t(item.bn, item.en)}</span>
                  {section.type === 'urgent' && (
                    <button className="text-xs bg-destructive text-destructive-foreground rounded-full px-3 py-1 font-body-bn">
                      {t('ঠিক করুন', 'Fix Now')}
                    </button>
                  )}
                  {section.type === 'warn' && (
                    <button className="text-xs bg-brand-yellow/10 text-foreground rounded-full px-3 py-1 font-body-bn">
                      {t('দেখুন', 'View')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountDoctor;
