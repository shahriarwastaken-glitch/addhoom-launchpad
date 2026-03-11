import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      className={cn(
        'fixed bottom-20 md:bottom-8 right-4 z-40 w-10 h-10 rounded-full',
        'bg-primary text-primary-foreground shadow-warm-lg',
        'flex items-center justify-center',
        'hover:opacity-90 transition-opacity animate-fade-up'
      )}
    >
      <ArrowUp size={18} />
    </button>
  );
};

export default ScrollToTopButton;
