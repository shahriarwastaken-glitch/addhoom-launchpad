import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const ContentCalendar = () => {
  const { t } = useLanguage();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const days = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    hasAd: Math.random() > 0.6,
    hasSocial: Math.random() > 0.7,
    hasEmail: Math.random() > 0.85,
  }));

  const weekDays = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-heading-bn font-bold text-foreground">
          {t('📅 কনটেন্ট ক্যালেন্ডার', '📅 Content Calendar')}
        </h2>
        <button className="bg-gradient-cta text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform font-body-bn">
          {t('৩ মাসের প্ল্যান তৈরি করুন', 'Generate 3-Month Plan')}
        </button>
      </div>

      <div className="bg-card rounded-[20px] shadow-warm p-6">
        <div className="text-center mb-4">
          <h3 className="font-heading-bn font-bold text-foreground">{t('মার্চ ২০২৬', 'March 2026')}</h3>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs text-muted-foreground font-body-bn py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* offset for starting day */}
          {Array.from({ length: 6 }, (_, i) => <div key={`empty-${i}`} />)}
          {days.map(day => (
            <button key={day.day} onClick={() => setSelectedDay(day.day)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all hover:bg-secondary ${selectedDay === day.day ? 'bg-primary/10 border border-primary' : ''}`}>
              <span className="font-mono text-foreground">{toBengali(day.day)}</span>
              <div className="flex gap-0.5 mt-1">
                {day.hasAd && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                {day.hasSocial && <div className="w-1.5 h-1.5 rounded-full bg-brand-green" />}
                {day.hasEmail && <div className="w-1.5 h-1.5 rounded-full bg-brand-purple" />}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-4 mt-4 justify-center">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary" /> {t('বিজ্ঞাপন', 'Ad')}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-brand-green" /> {t('সোশ্যাল', 'Social')}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-brand-purple" /> {t('ইমেইল', 'Email')}
          </div>
        </div>
      </div>

      {selectedDay && (
        <div className="mt-6 bg-card rounded-[20px] shadow-warm p-6 animate-fade-up">
          <h3 className="font-heading-bn font-bold text-foreground mb-4">
            {t(`মার্চ ${toBengali(selectedDay)} — কনটেন্ট`, `March ${selectedDay} — Content`)}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="w-2 h-8 rounded bg-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground font-body-bn">{t('ঈদ স্পেশাল অফার পোস্ট', 'Eid Special Offer Post')}</p>
                <p className="text-xs text-muted-foreground">Facebook · Instagram</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-green/5 border border-brand-green/20">
              <div className="w-2 h-8 rounded bg-brand-green" />
              <div>
                <p className="text-sm font-semibold text-foreground font-body-bn">{t('পণ্যের রিভিউ শেয়ার', 'Product Review Share')}</p>
                <p className="text-xs text-muted-foreground">Instagram Story</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentCalendar;
