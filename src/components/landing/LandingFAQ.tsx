import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const faqs = [
  { q: 'What are credits?', a: 'Credits power every generation in AdDhoom Studio. Each action costs a set number — generating an image costs 125 credits, a video costs 330 credits. Your credits reset every 30 days from your plan purchase date.' },
  { q: 'Do unused credits roll over?', a: 'No — credits reset on a 30-day rolling cycle from your plan purchase date. Unused credits do not carry over.' },
  { q: 'Can I explore before subscribing?', a: 'Yes — sign up and explore the entire dashboard for free. You only need to subscribe when you\'re ready to start generating.' },
  { q: 'What happens when I run out of credits?', a: 'Upgrade your plan or wait for your monthly reset on the 1st.' },
  { q: 'What languages are supported?', a: 'English, বাংলা (Bangla), and Banglish. Set your preference in workspace settings.' },
  { q: 'Can I use AdDhoom for multiple shops?', a: 'Yes. Pro includes 5 workspaces, Agency includes 20. Each has its own settings and Shop DNA.' },
  { q: 'Is there a contract?', a: 'No. Monthly subscription, cancel anytime.' },
  { q: 'What image formats can I upload?', a: 'JPG, PNG, and WEBP. Maximum 10MB per image.' },
];

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 sm:py-5 text-left group cursor-pointer">
        <span className="font-body-en text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors pr-4">{q}</span>
        <ChevronDown size={18} className={`text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[200px] pb-4 sm:pb-5' : 'max-h-0'}`}>
        <p className="font-body-en text-sm sm:text-[15px] text-muted-foreground leading-[1.7]">{a}</p>
      </div>
    </div>
  );
};

const LandingFAQ = () => {
  const { ref, isVisible } = useScrollReveal();
  return (
    <section id="faq" ref={ref} className="py-16 sm:py-[120px] px-4 sm:px-6 bg-background">
      <div className={`max-w-[720px] mx-auto transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
        <h2 className="text-center font-heading-en font-[800] text-foreground" style={{ fontSize: 'clamp(24px, 4vw, 40px)' }}>Common questions</h2>
        <div className="mt-8 sm:mt-12">
          {faqs.map(f => <FAQItem key={f.q} {...f} />)}
        </div>
      </div>
    </section>
  );
};

export default LandingFAQ;
