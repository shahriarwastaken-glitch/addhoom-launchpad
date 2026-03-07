import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const testimonials = [
  { name: 'Rabeya', shop: 'Fashion Shop', city: 'Dhaka', quote: { bn: 'ঈদের আগে ৩ দিনে ৫০টা বিজ্ঞাপন বানিয়েছি। আগে এটা এক সপ্তাহ লাগত।', en: 'Made 50 ads in 3 days before Eid. Used to take a week.' }, rating: 5 },
  { name: 'Tanvir', shop: 'Electronics', city: 'Chittagong', quote: { bn: 'ধুম স্কোর দেখে বুঝলাম কোন বিজ্ঞাপন চলবে। ROAS ৩x হয়ে গেছে।', en: 'Dhoom Score showed me which ads work. ROAS went 3x.' }, rating: 5 },
  { name: 'Nadia', shop: 'Beauty', city: 'Sylhet', quote: { bn: 'বাংলায় বিজ্ঞাপন লেখার ঝামেলা নেই আর। AI এতটা ভালো বাংলা লেখে!', en: 'No more struggling with Bangla ad copy. AI writes amazing Bangla!' }, rating: 5 },
  { name: 'Karim', shop: 'Gadgets', city: 'Rajshahi', quote: { bn: 'Daraz শপের লিংক দিলাম, ৫ মিনিটে ২০টা অ্যাড রেডি।', en: 'Gave my Daraz link, 20 ads ready in 5 minutes.' }, rating: 5 },
  { name: 'Fatima', shop: 'Clothing', city: 'Dhaka', quote: { bn: 'ভিডিও অ্যাড ফিচারটা অসাধারণ! পণ্যের ছবি থেকে রিলস তৈরি হয়ে যায়।', en: 'The video ad feature is amazing! Reels from product images.' }, rating: 5 },
  { name: 'Rahim', shop: 'Food Delivery', city: 'Khulna', quote: { bn: 'প্রতিযোগী গোয়েন্দা দিয়ে বুঝলাম তারা কী করছে। এখন আমি এগিয়ে।', en: "Competitor Intel showed me what they do. Now I'm ahead." }, rating: 4 },
];

const Testimonials = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();

  return (
    <section ref={ref} className="py-24 px-4 bg-secondary">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <span className="section-label">{t('সাফল্যের গল্প', 'Success Stories')}</span>
          <h2 className="mt-3 font-heading-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}>
            {t('৫০০+ বাংলাদেশী শপ AdDhoom ব্যবহার করছে', '500+ Bangladeshi Shops Use AdDhoom')}
          </h2>
        </div>
        <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
          {testimonials.map((item, i) => (
            <div key={i} className={`break-inside-avoid bg-card rounded-2xl p-6 shadow-warm transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground font-bold text-sm">{item.name[0]}</div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.shop}, {item.city}</div>
                </div>
              </div>
              <div className="text-brand-yellow text-xs mb-2">{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</div>
              <p className="text-sm text-foreground font-body-bn leading-relaxed">"{t(item.quote.bn, item.quote.en)}"</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <span className="inline-flex items-center gap-2 bg-card rounded-full px-6 py-3 shadow-warm text-sm font-body-bn">
            <span className="text-brand-yellow">★★★★★</span>
            <span className="text-foreground font-semibold">৪.৯/৫</span>
            <span className="text-muted-foreground">— ৫০০+ {t('রিভিউ', 'reviews')}</span>
          </span>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
