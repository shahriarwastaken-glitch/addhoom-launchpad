import { Upload, Zap, Rocket } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const steps = [
  { num: '01', icon: Upload, title: 'Upload your product', body: 'Take a photo or use an existing image. Background removed automatically.', img: '/landing/step-upload.webp' },
  { num: '02', icon: Zap, title: 'Choose what to create', body: 'Images, copy, video, or try-on — all from one studio.', img: '/landing/step-create.webp' },
  { num: '03', icon: Rocket, title: 'Publish your ad', body: 'Download, schedule in content calendar, or use directly in your next campaign.', img: '/landing/step-publish.webp' },
];

const LandingHowItWorks = () => {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="how-it-works" ref={ref} className="py-16 sm:py-[120px] px-4 sm:px-6 bg-background">
      <div className="max-w-[960px] mx-auto">
        <div className={`text-center mb-12 sm:mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <span className="font-mono text-xs tracking-[0.1em] text-primary uppercase">Simple process</span>
          <h2 className="mt-4 font-heading-en font-[800] text-foreground" style={{ fontSize: 'clamp(26px, 4vw, 48px)' }}>Three steps to your<br />next winning ad.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`relative bg-card rounded-[20px] border border-border p-6 sm:p-8 pt-8 sm:pt-10 overflow-hidden transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <span className="absolute top-4 right-4 font-heading-en font-[800] text-[60px] sm:text-[80px] leading-none select-none" style={{ color: 'rgba(255,81,0,0.08)' }}>{s.num}</span>
              <s.icon size={36} className="text-primary mb-3 sm:mb-4" strokeWidth={1.5} />
              <h3 className="font-heading-en text-lg sm:text-xl font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 font-body-en text-sm sm:text-[15px] text-muted-foreground leading-relaxed">{s.body}</p>
              <img src={s.img} alt={s.title} className="w-full h-[100px] sm:h-[120px] rounded-xl object-cover mt-4 sm:mt-6" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingHowItWorks;
