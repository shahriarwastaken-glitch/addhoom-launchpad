import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Store, Target, Bot, Rocket } from 'lucide-react';

const steps = [
  { num: '01', Icon: Store, titleBn: 'আপনার শপ যোগ করুন', titleEn: 'Add Your Shop', descBn: 'আপনার Daraz, Facebook Shop বা ওয়েবসাইটের লিংক দিন। AI স্বয়ংক্রিয়ভাবে আপনার ব্র্যান্ড বুঝে নেবে।', descEn: 'Add your Daraz, Facebook Shop or website link. AI automatically understands your brand.' },
  { num: '02', Icon: Target, titleBn: 'পণ্য ও লক্ষ্য বলুন', titleEn: 'Tell Your Goal', descBn: 'কোন পণ্যের বিজ্ঞাপন চাই, কোন প্ল্যাটফর্মে, কোন অনুষ্ঠানে — সহজ বাংলায় বলুন।', descEn: 'Which product, platform, occasion — just tell us in plain Bengali.' },
  { num: '03', Icon: Bot, titleBn: 'AI বিজ্ঞাপন তৈরি করে', titleEn: 'AI Creates Ads', descBn: 'ধুম স্কোরসহ একাধিক বিজ্ঞাপন কপি পান। কোনটা সবচেয়ে ভালো কাজ করবে AI বলে দেবে।', descEn: 'Get multiple ad copies with Dhoom Score. AI tells you which performs best.' },
  { num: '04', Icon: Rocket, titleBn: 'পোস্ট করুন, বিক্রি বাড়ান', titleEn: 'Post & Sell More', descBn: 'সেরা বিজ্ঞাপন বেছে নিন, সরাসরি কপি করুন, প্ল্যাটফর্মে পোস্ট করুন। ব্যস!', descEn: 'Pick the best, copy directly, post on platform. Done!' },
];

const HowItWorks = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="how-it-works" ref={ref} className="py-24 px-6 bg-secondary">
      <div className="max-w-[1100px] mx-auto">
        <div className={`text-center mb-[72px] transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'}`}>
          <span className="landing-pill">{t('প্রক্রিয়া', 'Process')}</span>
          <h2 className="mt-3 font-bn font-bold text-foreground" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>{t('মাত্র ৪টি ধাপে শুরু করুন', 'Start in Just 4 Steps')}</h2>
          <p className="mt-3 font-bn text-lg text-muted-foreground">{t('জটিল কিছু নেই। কোনো টেকনিক্যাল জ্ঞান লাগবে না।', 'Nothing complex. No technical knowledge needed.')}</p>
        </div>
        <div className="relative grid md:grid-cols-4 gap-6">
          <div className="hidden md:block absolute top-[30px] left-[12.5%] right-[12.5%] border-t-2 border-dashed border-border z-0" />
          {steps.map((step, i) => (
            <div key={step.num} className={`relative z-[1] bg-card rounded-[20px] p-8 border border-border text-center hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(255,81,0,0.08)] transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'}`} style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="w-[60px] h-[60px] mx-auto rounded-full bg-gradient-brand flex items-center justify-center shadow-[0_8px_24px_rgba(255,81,0,0.3)]"><span className="font-en text-2xl font-[800] text-primary-foreground">{step.num}</span></div>
              <div className="mt-5 w-12 h-12 mx-auto flex items-center justify-center text-primary"><step.Icon className="w-10 h-10" /></div>
              <h3 className="mt-4 font-bn text-xl font-bold text-foreground">{t(step.titleBn, step.titleEn)}</h3>
              <p className="mt-2 font-bn text-[15px] text-muted-foreground leading-relaxed">{t(step.descBn, step.descEn)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
