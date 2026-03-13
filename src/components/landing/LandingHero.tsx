import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, PenTool, Video, Shirt, Play, Check, Sparkles, ArrowRight } from 'lucide-react';

const WavyUnderline = () => (
  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none">
    <path d="M0 6C50 0 100 12 150 6C200 0 250 12 300 6" stroke="hsl(var(--brand-orange))" strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>
);

const HeroPreviewCard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    { icon: Camera, label: 'Images' },
    { icon: PenTool, label: 'Copy' },
    { icon: Video, label: 'Video' },
    { icon: Shirt, label: 'Try-On' },
  ];

  const LandingImg = ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} className="w-full h-full object-cover rounded-lg" loading="lazy" />
  );

  return (
    <div className="bg-card rounded-[20px] shadow-[0_24px_80px_rgba(0,0,0,0.12)] overflow-hidden w-full max-w-[480px] mx-auto lg:mx-0" style={{ transform: 'rotate(-2deg)' }}>
      {/* Tab bar */}
      <div className="flex gap-1 p-2 overflow-x-auto scrollbar-none" style={{ background: '#F8F5F0' }}>
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-body-en text-[12px] sm:text-[13px] transition-all whitespace-nowrap shrink-0 ${activeTab === i ? 'bg-card text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-muted-foreground'}`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="h-[220px] sm:h-[280px] lg:h-[320px] relative">
        {/* Images tab */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex h-full">
            <div className="flex-1 relative p-2 sm:p-3">
              <LandingImg src="/landing/hero-before.webp" alt="Raw product photo" />
              <span className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 bg-foreground/70 text-primary-foreground text-[10px] font-mono px-2 py-0.5 rounded">Before</span>
            </div>
            <div className="w-[2px] bg-card" />
            <div className="flex-1 relative p-2 sm:p-3">
              <LandingImg src="/landing/hero-after.webp" alt="AI-generated product scene" />
              <span className="absolute bottom-3 sm:bottom-5 right-3 sm:right-5 bg-primary text-primary-foreground text-[10px] font-mono px-2 py-0.5 rounded">After</span>
            </div>
          </div>
        </div>

        {/* Copy tab */}
        <div className={`absolute inset-0 transition-opacity duration-300 p-3 sm:p-5 ${activeTab === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="bg-secondary rounded-xl p-3 sm:p-4 border border-border">
            <p className="font-heading-en text-sm sm:text-base font-bold text-foreground leading-snug">Stop settling for photos that look like everyone else's.</p>
            <p className="font-body-en text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">Your product deserves better. AdDhoom Studio generates professional ad images in seconds.</p>
            <p className="font-body-en text-xs sm:text-sm font-semibold text-primary mt-2 sm:mt-3">Shop Now →</p>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-3">
            <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-3 py-1">84 Dhoom!</span>
          </div>
          <div className="flex gap-1.5 mt-2">
            {['PAS', 'Solution Aware', 'Bold'].map(t => (
              <span key={t} className="text-[10px] font-mono text-muted-foreground bg-secondary rounded-full px-2.5 py-0.5 border border-border">{t}</span>
            ))}
          </div>
        </div>

        {/* Video tab */}
        <div className={`absolute inset-0 transition-opacity duration-300 p-3 sm:p-5 ${activeTab === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="w-full h-[140px] sm:h-[200px] rounded-xl bg-foreground/90 flex items-center justify-center relative">
            <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-card flex items-center justify-center">
              <Play className="w-5 sm:w-6 h-5 sm:h-6 text-primary ml-1" fill="hsl(var(--brand-orange))" />
            </div>
            <span className="absolute bottom-3 left-3 text-[11px] font-mono text-primary-foreground/70">5s product video</span>
          </div>
          <div className="flex gap-2 mt-2 sm:mt-3">
            {['9:16', '1:1', '16:9'].map(f => (
              <span key={f} className="text-[11px] font-mono text-muted-foreground bg-secondary rounded-full px-3 py-1 border border-border">{f}</span>
            ))}
          </div>
        </div>

        {/* Try-On tab */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 3 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex h-full">
            <div className="flex-1 relative p-2 sm:p-3">
              <Placeholder label="Flat lay garment" />
              <span className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 bg-foreground/70 text-primary-foreground text-[10px] font-mono px-2 py-0.5 rounded">Product</span>
            </div>
            <div className="w-[2px] bg-card" />
            <div className="flex-1 relative p-2 sm:p-3">
              <Placeholder label="Model wearing it" />
              <span className="absolute bottom-3 sm:bottom-5 right-3 sm:right-5 bg-primary text-primary-foreground text-[10px] font-mono px-2 py-0.5 rounded">Try-On</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LandingHero = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const anim = (delay: number) => `transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`;

  return (
    <section className="relative pt-24 sm:pt-[100px] pb-16 sm:pb-24 px-4 sm:px-6 bg-background overflow-hidden min-h-[calc(100vh-64px)] lg:min-h-screen flex items-center">
      <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[1.5fr_1fr] gap-10 lg:gap-16 items-center w-full">
        {/* Left */}
        <div>
          <div className={anim(0)} style={{ transitionDelay: '0ms' }}>
            <span className="inline-block font-mono text-[11px] font-medium text-primary-foreground bg-primary rounded-full px-[14px] py-1.5 mb-4 sm:mb-6">AI Ad Studio</span>
          </div>

          <h1>
            <span className={`block font-heading-en font-[800] text-foreground leading-[1.08] ${anim(100)}`} style={{ fontSize: 'clamp(32px, 5.5vw, 72px)', transitionDelay: '100ms' }}>From product</span>
            <span className={`block font-heading-en font-[800] text-foreground leading-[1.08] ${anim(200)}`} style={{ fontSize: 'clamp(32px, 5.5vw, 72px)', transitionDelay: '200ms' }}>to <span className="relative inline-block">published<WavyUnderline /></span></span>
            <span className={`block font-heading-en font-[800] text-foreground leading-[1.08] ${anim(300)}`} style={{ fontSize: 'clamp(32px, 5.5vw, 72px)', transitionDelay: '300ms' }}>in minutes.</span>
          </h1>

          <p className={`mt-4 sm:mt-6 font-body-en text-base sm:text-xl text-muted-foreground leading-relaxed max-w-[520px] ${anim(400)}`} style={{ transitionDelay: '400ms' }}>
            Generate studio-quality product images, scroll-stopping ad copy, and cinematic video ads — all from one studio.
          </p>

          <div className={`mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${anim(500)}`} style={{ transitionDelay: '500ms' }}>
            <Link to="/auth" className="font-body-en text-base font-semibold text-primary-foreground bg-primary rounded-[14px] h-[52px] px-7 flex items-center justify-center hover:opacity-90 hover:scale-[1.02] transition-all duration-200">
              Start Creating <ArrowRight size={16} className="ml-1.5" />
            </Link>
            <a href="#how-it-works" className="font-body-en text-base font-medium text-foreground border-[1.5px] border-border rounded-[14px] h-[52px] px-7 flex items-center justify-center hover:border-primary hover:text-primary transition-all duration-200">
              See how it works ↓
            </a>
          </div>

          <p className={`mt-4 font-body-en text-[13px] text-muted-foreground text-center sm:text-left ${anim(600)}`} style={{ transitionDelay: '600ms' }}>
            No credit card required to explore. Subscribe when you're ready to create.
          </p>
        </div>

        {/* Right — preview card */}
        <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`} style={{ transitionDelay: '300ms' }}>
          <HeroPreviewCard />
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
