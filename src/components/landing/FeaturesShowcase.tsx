import { useState } from 'react';
import { Camera, PenTool, Video, Shirt, Check, ArrowRight, Target, Home, Sparkles } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const Placeholder = ({ label }: { label: string }) => (
  <div className="w-full h-full min-h-[120px] rounded-xl flex items-center justify-center" style={{ background: '#F0EDE8', border: '1.5px dashed #D4CFC8' }}>
    <span className="font-mono text-[11px] text-muted-foreground">{label}</span>
  </div>
);

const FeatureCheck = ({ text }: { text: string }) => (
  <li className="flex items-start gap-2.5 text-[15px] font-body-en text-foreground">
    <Check size={16} className="text-brand-green shrink-0 mt-0.5" />
    {text}
  </li>
);

const tabs = [
  {
    icon: Camera, label: 'Product Images',
    title: 'Studio-quality\nproduct photography',
    body: 'Upload your product photo. Choose Studio, Lifestyle, or Luxury. Get professional ad images in seconds — no photographer, no studio, no hassle.',
    checks: ['3 scene variants per generation', 'Professional lighting and composition', 'Background removal included', 'Text overlay with price and offer', 'Download in full resolution'],
    cta: 'Generate your first image',
    right: (
      <div className="grid grid-cols-2 gap-3 max-w-[460px]">
        <div className="col-span-1 row-span-1"><Placeholder label="Studio scene" /><span className="flex items-center gap-1 mt-1.5 text-[11px] font-mono text-muted-foreground"><Target size={12} /> Studio</span></div>
        <div className="col-span-1 row-span-1 mt-8"><Placeholder label="Lifestyle scene" /><span className="flex items-center gap-1 mt-1.5 text-[11px] font-mono text-muted-foreground"><Home size={12} /> Lifestyle</span></div>
        <div className="col-span-2 mt-2"><div className="max-w-[200px] mx-auto"><Placeholder label="Luxury scene" /><span className="flex items-center gap-1 mt-1.5 text-[11px] font-mono text-muted-foreground"><Sparkles size={12} /> Luxury</span></div></div>
      </div>
    ),
  },
  {
    icon: PenTool, label: 'Ad Copy',
    title: 'Ad copy built on proven\ncopywriting frameworks',
    body: 'Every ad is written using professional direct-response frameworks. Then scored by Dhoom Score so you know what will work before you spend.',
    checks: ['RIOA framework — one reader, one idea', 'Awareness-stage calibration', 'Objection handling built in', 'English, বাংলা, and Banglish', 'Dhoom Score on every variation'],
    cta: 'Generate your first ad',
    right: (
      <div className="bg-card rounded-2xl shadow-warm-lg p-6 max-w-[400px] border border-border">
        <p className="font-heading-en text-lg font-bold text-foreground leading-snug">Stop settling for photos that look like everyone else's.</p>
        <p className="font-body-en text-sm text-muted-foreground mt-3 leading-relaxed">Your product deserves better. AdDhoom Studio generates professional ad images in seconds — no photographer, no studio needed.</p>
        <p className="font-body-en text-sm font-semibold text-primary mt-3">Shop Now →</p>
        <div className="h-px bg-border my-4" />
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full px-3 py-1">84 Dhoom!</span>
          {['PAS', 'Bold', 'Solution Aware'].map(t => (
            <span key={t} className="text-[10px] font-mono text-muted-foreground bg-secondary rounded-full px-2.5 py-0.5 border border-border">{t}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Video, label: 'Video Ads',
    title: 'Cinematic product videos\nfrom a single photo',
    body: 'Describe the motion you want. AdDhoom Studio turns your product image into a 5-second video ad — ready for Reels, Feed, or Stories.',
    checks: ['Powered by Seedance V1.5 Pro Fast', '9:16 Reels / 1:1 Feed / 16:9 Landscape', 'Professional motion prompts included', 'Download in HD', 'No video editing skills needed'],
    cta: 'Create your first video',
    right: (
      <div className="grid grid-cols-3 gap-3 max-w-[400px]">
        {['9:16', '1:1', '16:9'].map(f => (
          <div key={f} className="bg-foreground/90 rounded-xl aspect-square flex items-center justify-center relative">
            <div className="w-10 h-10 rounded-full bg-card/90 flex items-center justify-center"><Video size={16} className="text-primary ml-0.5" /></div>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-primary-foreground/70 bg-foreground/50 rounded px-1.5 py-0.5">{f}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Shirt, label: 'Virtual Try-On',
    title: 'Show your clothing\non real-looking models',
    body: 'No model photoshoot needed. Upload your garment, choose model attributes — get realistic try-on images that make customers confident buying.',
    checks: ['Multiple model types and skin tones', 'Different poses and body types', 'Swap models with one click', 'Use results directly in ads', 'Works with any garment type'],
    cta: 'Try on your product',
    right: (
      <div className="flex rounded-2xl overflow-hidden max-w-[400px] border border-border">
        <div className="flex-1 relative"><Placeholder label="Flat lay garment" /><span className="absolute bottom-3 left-3 bg-foreground/70 text-primary-foreground text-[10px] font-mono px-2 py-0.5 rounded">Product</span></div>
        <div className="w-[2px] bg-card" />
        <div className="flex-1 relative"><Placeholder label="Model wearing it" /><span className="absolute bottom-3 right-3 bg-primary text-primary-foreground text-[10px] font-mono px-2 py-0.5 rounded">Try-On</span></div>
      </div>
    ),
  },
];

const FeaturesShowcase = () => {
  const [active, setActive] = useState(0);
  const { ref, isVisible } = useScrollReveal();
  const tab = tabs[active];

  return (
    <section id="features" ref={ref} className="py-[120px] px-6 bg-card">
      <div className={`max-w-[1200px] mx-auto transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
        {/* Header */}
        <div className="text-center mb-16">
          <span className="font-mono text-xs tracking-[0.1em] text-primary uppercase">Everything in one studio</span>
          <h2 className="mt-4 font-heading-en font-[800] text-foreground" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>One upload.<br />Infinite creative directions.</h2>
          <p className="mt-4 font-body-en text-xl text-muted-foreground max-w-[500px] mx-auto">Every tool you need to go from raw product photo to published ad.</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-16 flex-wrap">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2 px-6 py-3 font-body-en text-[15px] border-b-2 transition-all duration-200 ${active === i ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-[45%_55%] gap-12 lg:gap-20 items-center">
          <div key={active} className="animate-fade-in">
            <h3 className="font-heading-en font-bold text-foreground whitespace-pre-line" style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}>{tab.title}</h3>
            <p className="mt-4 font-body-en text-lg text-muted-foreground leading-[1.7]">{tab.body}</p>
            <ul className="mt-6 space-y-2.5">
              {tab.checks.map(c => <FeatureCheck key={c} text={c} />)}
            </ul>
            <button onClick={() => window.location.href = '/auth'} className="mt-8 font-body-en text-[15px] font-semibold text-primary flex items-center gap-1.5 hover:gap-2.5 transition-all duration-200">
              {tab.cta} <ArrowRight size={16} />
            </button>
          </div>
          <div key={`right-${active}`} className="animate-fade-in flex justify-center">
            {tab.right}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesShowcase;
