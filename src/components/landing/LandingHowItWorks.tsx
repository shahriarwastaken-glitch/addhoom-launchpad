import { Upload, Zap, Rocket, ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const Placeholder = ({ label }: { label: string }) => (
  <div className="w-full h-[120px] rounded-xl flex items-center justify-center mt-6" style={{ background: '#F0EDE8', border: '1.5px dashed #D4CFC8' }}>
    <span className="font-mono text-[11px] text-muted-foreground">{label}</span>
  </div>
);

const steps = [
  { num: '01', icon: Upload, title: 'Upload your product', body: 'Take a photo or use an existing image. Background removed automatically.', placeholder: 'Upload zone illustration' },
  { num: '02', icon: Zap, title: 'Choose what to create', body: 'Images, copy, video, or try-on — all from one studio.', placeholder: 'Creation options illustration' },
  { num: '03', icon: Rocket, title: 'Publish your ad', body: 'Download, schedule in content calendar, or use directly in your next campaign.', placeholder: 'Publishing illustration' },
];

const LandingHowItWorks = () => {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="how-it-works" ref={ref} className="py-[120px] px-6 bg-background">
      <div className="max-w-[960px] mx-auto">
        <div className={`text-center mb-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <span className="font-mono text-xs tracking-[0.1em] text-primary uppercase">Simple process</span>
          <h2 className="mt-4 font-heading-en font-[800] text-foreground" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>Three steps to your<br />next winning ad.</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`relative bg-card rounded-[20px] border border-border p-8 pt-10 overflow-hidden transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <span className="absolute top-4 right-4 font-heading-en font-[800] text-[80px] leading-none select-none" style={{ color: 'rgba(255,81,0,0.08)' }}>{s.num}</span>
              <s.icon size={40} className="text-primary mb-4" strokeWidth={1.5} />
              <h3 className="font-heading-en text-xl font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 font-body-en text-[15px] text-muted-foreground leading-relaxed">{s.body}</p>
              <Placeholder label={s.placeholder} />
            </div>
          ))}
        </div>

        {/* Arrow connectors (desktop only) */}
        <div className="hidden md:flex justify-center gap-[calc(33.333%-40px)] mt-[-200px] mb-[200px] pointer-events-none relative z-10">
          {[0, 1].map(i => (
            <ArrowRight key={i} size={24} className="text-primary opacity-40" />
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingHowItWorks;
