import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  { qBn: 'AdDhoom কি সত্যিই বাংলায় বিজ্ঞাপন লিখতে পারে?', qEn: 'Can AdDhoom really write ads in Bengali?', aBn: 'হ্যাঁ, AdDhoom বাংলাদেশের বাজারের জন্য বিশেষভাবে তৈরি। একদম দেশীয় ভাষায়, দেশীয় কায়দায় বিজ্ঞাপন লেখে। Banglish সাপোর্টও আছে।', aEn: 'Yes, specially built for BD market. Writes in authentic local style. Banglish support too.' },
  { qBn: 'ফ্রি ট্রায়াল আছে কি?', qEn: 'Is there a free trial?', aBn: 'Pro প্ল্যান দিয়ে শুরু করুন — ৭ দিনের মধ্যে সন্তুষ্ট না হলে সম্পূর্ণ অর্থ ফেরত।', aEn: 'Start with Pro — full refund within 7 days if not satisfied.' },
  { qBn: 'কোন প্ল্যাটফর্মের জন্য কাজ করে?', qEn: 'Which platforms?', aBn: 'Facebook, Instagram, Daraz, Google — এই চারটি প্ল্যাটফর্মের জন্য অপটিমাইজড বিজ্ঞাপন তৈরি করা যায়।', aEn: 'Facebook, Instagram, Daraz, Google — optimized ads for all four.' },
  { qBn: 'পেমেন্ট কীভাবে করব?', qEn: 'How do I pay?', aBn: 'bKash, Nagad, Rocket, ভিসা, মাস্টারকার্ড — SSLCommerz এর মাধ্যমে সম্পূর্ণ নিরাপদ।', aEn: 'bKash, Nagad, Rocket, Visa, Mastercard — fully secure via SSLCommerz.' },
  { qBn: 'Agency প্ল্যানে কতজন ক্লায়েন্ট?', qEn: 'How many clients in Agency?', aBn: '২০টি আলাদা ওয়ার্কস্পেস। প্রতিটিতে আলাদা ব্র্যান্ড ভয়েস ও হোয়াইট লেবেল রিপোর্ট।', aEn: '20 separate workspaces with unique brand voice and white label reports.' },
  { qBn: 'ধুম স্কোর কীভাবে কাজ করে?', qEn: 'How does Dhoom Score work?', aBn: '৬টি মাত্রায় বিজ্ঞাপন মূল্যায়ন করে: হুক শক্তি, বাংলা ভাষা, কৌশল, CTA, মোবাইল পাঠযোগ্যতা, বাজার ফিট। ১-১০০ স্কেলে।', aEn: 'Evaluates ads on 6 dimensions on a 1-100 scale.' },
  { qBn: 'ডেটা কি নিরাপদ?', qEn: 'Is my data safe?', aBn: 'এনক্রিপ্টেড ডেটাবেসে সংরক্ষিত। তৃতীয় পক্ষকে কখনো দেওয়া হয় না।', aEn: 'Stored in encrypted database. Never shared with third parties.' },
];

const FAQ = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section id="faq" ref={ref} className="py-24 px-6 bg-secondary">
      <div className="max-w-[720px] mx-auto">
        <div className={`text-center mb-14 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'}`}>
          <span className="landing-pill">{t('প্রশ্নোত্তর', 'FAQ')}</span>
          <h2 className="mt-3 font-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>{t('সাধারণ প্রশ্নসমূহ', 'Common Questions')}</h2>
          <p className="mt-3 font-bn text-base text-muted-foreground">{t('আরো জানতে hello@addhoom.com এ লিখুন', 'Write hello@addhoom.com for more')}</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => { const open = openIdx === i; return (
            <div key={i} className={`bg-card rounded-2xl border overflow-hidden transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'} ${open ? 'border-primary shadow-[0_4px_24px_rgba(255,81,0,0.08)]' : 'border-border'}`} style={{ transitionDelay: `${i * 50}ms` }}>
              <button onClick={() => setOpenIdx(open ? null : i)} className="w-full flex items-center justify-between px-7 py-6 text-left hover:bg-primary/[0.02] transition-colors">
                <span className="font-bn text-[17px] font-semibold text-foreground pr-4">{t(faq.qBn, faq.qEn)}</span>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${open ? 'bg-primary/10' : 'bg-secondary'}`}>{open ? <Minus className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-muted-foreground" />}</div>
              </button>
              <div className={`overflow-hidden transition-all duration-400 ${open ? 'max-h-[500px]' : 'max-h-0'}`}>
                <div className="px-7 pb-6 border-t border-border pt-4"><p className="font-bn text-[15px] text-muted-foreground leading-relaxed">{t(faq.aBn, faq.aEn)}</p></div>
              </div>
            </div>
          );})}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
