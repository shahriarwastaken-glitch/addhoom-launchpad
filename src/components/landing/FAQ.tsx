import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Plus } from 'lucide-react';

const faqs = [
  { q: { bn: 'bKash বা Nagad দিয়ে পেমেন্ট করা যাবে?', en: 'Can I pay with bKash or Nagad?' }, a: { bn: 'হ্যাঁ! bKash, Nagad, Rocket সহ সব মোবাইল ব্যাংকিং ও Visa/Mastercard সাপোর্ট করি।', en: 'Yes! We support bKash, Nagad, Rocket, Visa/Mastercard.' } },
  { q: { bn: 'Daraz শপের লিংক কি কাজ করবে?', en: 'Will my Daraz shop link work?' }, a: { bn: 'অবশ্যই! Daraz, Facebook Shop, Instagram, এবং যেকোনো ওয়েবসাইটের লিংক দিয়ে AI বিজ্ঞাপন তৈরি করতে পারবেন।', en: 'Absolutely! Works with Daraz, Facebook Shop, Instagram, and any website.' } },
  { q: { bn: 'বাংলায় ভিডিও অ্যাড তৈরি করা যাবে?', en: 'Can I create video ads in Bangla?' }, a: { bn: 'হ্যাঁ! AI বাংলা ক্যাপশন, ভয়েসওভার সহ ভিডিও অ্যাড তৈরি করে। Reels, TikTok, YouTube Shorts সব ফরম্যাটে।', en: 'Yes! AI creates video ads with Bangla captions and voiceover.' } },
  { q: { bn: 'ঈদ বা পহেলা বৈশাখের জন্য টেমপ্লেট আছে?', en: 'Templates for Eid and Pohela Boishakh?' }, a: { bn: 'হ্যাঁ! ঈদ, বৈশাখ, পূজা, ১৬ ডিসেম্বর সহ সব উৎসবের জন্য রেডিমেড ক্যাম্পেইন টেমপ্লেট আছে।', en: 'Yes! Ready-made campaigns for all festivals.' } },
  { q: { bn: 'ফ্রি প্ল্যানে ক্রেডিট কার্ড লাগবে?', en: 'Credit card needed for free plan?' }, a: { bn: 'না! ফ্রি প্ল্যান শুরু করতে কোনো ক্রেডিট কার্ড বা পেমেন্ট লাগবে না।', en: 'No! Start free without any credit card.' } },
  { q: { bn: 'আমার শপের ডেটা কি নিরাপদ?', en: 'Is my shop data safe?' }, a: { bn: 'সম্পূর্ণ নিরাপদ। এন্টারপ্রাইজ-লেভেল সিকিউরিটি ব্যবহার করি এবং ডেটা তৃতীয় পক্ষের সাথে শেয়ার করি না।', en: 'Completely safe. Enterprise-level security. Never shared.' } },
];

const FAQ = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section ref={ref} id="faq" className="py-24 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <span className="section-label">FAQ</span>
          <h2 className="mt-3 font-heading-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}>
            {t('সাধারণ জিজ্ঞাসা', 'Frequently Asked Questions')}
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className={`bg-card rounded-2xl shadow-warm overflow-hidden transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: `${i * 0.06}s` }}>
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                <span className="text-base font-heading-bn font-semibold text-foreground pr-4">{t(faq.q.bn, faq.q.en)}</span>
                <span className="flex-shrink-0 text-primary transition-transform duration-300" style={{ transform: open === i ? 'rotate(45deg)' : 'rotate(0)' }}>
                  <Plus size={20} />
                </span>
              </button>
              <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: open === i ? '200px' : '0' }}>
                <p className="px-5 pb-5 text-sm text-muted-foreground font-body-bn leading-relaxed">{t(faq.a.bn, faq.a.en)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
