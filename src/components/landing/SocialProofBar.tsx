import { Camera, PenTool, Video, Shirt, Zap, Calendar, Search, Globe } from 'lucide-react';

const chips1 = [
  { icon: Camera, label: 'Studio-Quality Images' },
  { icon: PenTool, label: 'Copy That Converts' },
  { icon: Video, label: 'Cinematic Video Ads' },
  { icon: Shirt, label: 'Virtual Try-On' },
  { icon: Zap, label: 'Dhoom Score' },
  { icon: Calendar, label: 'Content Calendar' },
  { icon: Search, label: 'Account Doctor' },
  { icon: Globe, label: 'Global + Local Pricing' },
];

const chips2 = [chips1[3], chips1[0], chips1[5], chips1[1], chips1[7], chips1[2], chips1[6], chips1[4]];

const ChipRow = ({ chips, direction }: { chips: typeof chips1; direction: 'left' | 'right' }) => {
  const doubled = [...chips, ...chips];
  return (
    <div className="overflow-hidden group">
      <div className={`flex gap-4 ${direction === 'left' ? 'animate-marquee-right' : 'animate-marquee-left'} group-hover:[animation-play-state:paused]`}>
        {doubled.map((c, i) => (
          <span key={i} className="flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-[13px] font-body-en shrink-0" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
            <c.icon size={14} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const SocialProofBar = () => (
  <section className="w-full py-5 overflow-hidden" style={{ background: '#1C1B1A' }}>
    <div className="space-y-3">
      <ChipRow chips={chips1} direction="left" />
      <ChipRow chips={chips2} direction="right" />
    </div>
  </section>
);

export default SocialProofBar;
