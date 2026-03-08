import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Star, BadgeCheck } from 'lucide-react';

const testimonials = [
  { name: 'রহিম আহমেদ', nameEn: 'Raihan Ahmed', shop: 'Fashion Dhaka · Daraz Seller', color: '#FF5100', quoteBn: 'AdDhoom দিয়ে ঈদে আমার বিক্রি ৩ গুণ হয়েছে। ধুম স্কোর দেখে বিজ্ঞাপন বেছে নেওয়াটা সত্যিই অসাধারণ।', quoteEn: 'My sales tripled during Eid with AdDhoom. Choosing ads based on Dhoom Score is truly amazing.' },
  { name: 'সাবরিনা খানম', nameEn: 'Sabrina Khanam', shop: 'Shondha Store · Instagram', color: '#6C3FE8', quoteBn: 'বাংলায় বিজ্ঞাপন লেখা নিয়ে সবসময় চিন্তায় থাকতাম। AdDhoom এর AI একদম দেশীয় ভাষায় লেখে।', quoteEn: 'Always worried about writing ads in Bengali. AdDhoom AI writes in authentic local style.' },
  { name: 'তানভীর ইসলাম', nameEn: 'Tanvir Islam', shop: 'Digital Agency, Chittagong', color: '#00B96B', quoteBn: '১৫টা ক্লায়েন্ট ম্যানেজ করি। Agency প্ল্যানে সব ওয়ার্কস্পেস আলাদা।', quoteEn: 'I manage 15 clients. Agency plan has separate workspaces for each.' },
  { name: 'ফাতেমা বেগম', nameEn: 'Fatema Begum', shop: 'Grihakon Home Decor · Facebook', color: '#FFB800', quoteBn: 'কনটেন্ট ক্যালেন্ডার ফিচার আমার জীবন বদলে দিয়েছে। আর শেষ মুহূর্তের তাড়াহুড়ো নেই।', quoteEn: 'Content calendar changed my life. No more last-minute rush ever.' },
  { name: 'মাহবুব আলম', nameEn: 'Mahbub Alam', shop: 'TechZone BD · Daraz Power Seller', color: '#E4405F', quoteBn: 'প্রতিযোগী বিশ্লেষণ ফিচারটা gold। বিক্রি ৪০% বেড়েছে।', quoteEn: 'Competitor analysis feature is gold. Sales up 40%.' },
  { name: 'নাদিয়া রহমান', nameEn: 'Nadia Rahman', shop: 'Blossom Beauty · Instagram', color: '#8B5CF6', quoteBn: 'ভিডিও বিজ্ঞাপন বানানো এত সহজ হবে জানতাম না। Agency কে মাসে ৳১৫,০০০ দেওয়া বন্ধ করেছি।', quoteEn: 'Didn\'t know video ads could be this easy. Stopped paying ৳15,000/month to agency.' },
];

const Testimonials = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();
  return (
    <section ref={ref} className="py-24 px-6 bg-background">
      <div className="max-w-[1200px] mx-auto">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'}`}>
          <span className="landing-pill">{t('গ্রাহকদের কথা', 'Testimonials')}</span>
          <h2 className="mt-3 font-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>{t('তারা কী বলছেন', 'What They Say')}</h2>
        </div>
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
          {testimonials.map((item, i) => (
            <div key={i} className={`break-inside-avoid mb-4 bg-card rounded-[20px] border border-border p-7 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'}`} style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="flex gap-0.5 mb-3">{[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-brand-yellow text-brand-yellow" />)}</div>
              <div className="relative"><span className="font-en text-5xl text-primary/20 leading-none absolute -top-2 -left-1">&ldquo;</span><p className="font-bn text-[15px] text-foreground leading-relaxed italic pl-6 pt-2">{t(item.quoteBn, item.quoteEn)}</p></div>
              <div className="flex items-center gap-3 mt-5">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0" style={{ background: item.color }}>{item.name.charAt(0)}</div>
                <div><div className="font-bn text-[15px] font-bold text-foreground">{t(item.name, item.nameEn)}</div><div className="font-bn text-[13px] text-muted-foreground">{item.shop}</div></div>
                <span className="ml-auto flex items-center gap-1 text-[11px] font-bn text-brand-green"><BadgeCheck className="w-3.5 h-3.5" />{t('যাচাইকৃত','Verified')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
