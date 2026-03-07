import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const steps = [
  { num: '০১', title: { bn: 'শপের লিংক দিন', en: 'Paste Your Link' }, desc: { bn: 'Daraz, Facebook বা ওয়েবসাইটের URL দিন। AI আপনার ব্র্যান্ড মিনিটে শিখে নেবে।', en: 'Paste your Daraz, Facebook, or website URL. AI learns your brand in minutes.' }, emoji: '🔗' },
  { num: '০২', title: { bn: 'আইডিয়া সোয়াইপ করুন', en: 'Swipe Ideas' }, desc: { bn: 'প্রতিদিন নতুন বিজ্ঞাপনের আইডিয়া পাবেন। পছন্দের গুলো সেভ করুন।', en: 'Get fresh ad ideas daily. Save the ones you like.' }, emoji: '👆' },
  { num: '০৩', title: { bn: 'এডিট করুন', en: 'Edit Anything' }, desc: { bn: 'কপি, টোন, প্ল্যাটফর্ম — যেকোনো কিছু পরিবর্তন করুন।', en: 'Change copy, tone, platform. No design skills needed.' }, emoji: '✏️' },
  { num: '০৪', title: { bn: 'লঞ্চ করুন', en: 'Launch' }, desc: { bn: 'ডাউনলোড বা সরাসরি পাবলিশ করুন। ১০x বেশি কনটেন্ট, ৭৫% দ্রুত।', en: 'Download or publish directly. 10x more content, 75% faster.' }, emoji: '🚀' },
];

const HowItWorks = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();

  return (
    <section ref={ref} className="py-24 px-4 bg-secondary">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <span className="section-label">{t('কীভাবে কাজ করে', 'How It Works')}</span>
          <h2 className="mt-3 font-heading-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}>
            {t('৪টি ধাপে আপনার শপের মার্কেটিং সম্পূর্ণ', 'Complete Marketing in 4 Steps')}
          </h2>
        </div>
        <div className="relative grid md:grid-cols-4 gap-8">
          <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 border-t-2 border-dashed border-primary/30" />
          {steps.map((step, i) => (
            <div key={i} className={`relative flex flex-col items-center text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: `${i * 0.15}s` }}>
              <span className="absolute -top-4 text-8xl font-heading-en font-extrabold text-primary/[0.06] select-none">{step.num}</span>
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-card shadow-warm flex items-center justify-center text-3xl mb-4">{step.emoji}</div>
              <h3 className="text-lg font-heading-bn font-bold text-foreground mb-2">{t(step.title.bn, step.title.en)}</h3>
              <p className="text-sm text-muted-foreground font-body-bn leading-relaxed">{t(step.desc.bn, step.desc.en)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
