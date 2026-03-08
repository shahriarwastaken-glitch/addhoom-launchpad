import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeatureTooltips } from '@/hooks/useFeatureTooltips';

type TooltipKey = 'dhoom_score' | 'winner_star' | 'remix_button' | 'calendar_generate';

interface FeatureTooltipProps {
  tooltipKey: TooltipKey;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const FeatureTooltip = ({ tooltipKey, children, position = 'top', className = '' }: FeatureTooltipProps) => {
  const { shouldShow, dismiss, getTooltip } = useFeatureTooltips();
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Small delay so the UI renders first
    const timer = setTimeout(() => {
      if (shouldShow(tooltipKey)) setVisible(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [tooltipKey, shouldShow]);

  if (!visible) return <>{children}</>;

  const tooltip = getTooltip(tooltipKey);

  const posClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3',
  };

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-primary border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-primary border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-primary border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-primary border-y-transparent border-l-transparent',
  };

  const arrowSize: Record<string, string> = {
    top: 'border-[6px]',
    bottom: 'border-[6px]',
    left: 'border-[6px]',
    right: 'border-[6px]',
  };

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 ${posClasses[position]}`}
          >
            <div className="bg-card border border-border rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] px-4 py-3 max-w-[240px] relative">
              {/* Arrow */}
              <div className={`absolute w-0 h-0 ${arrowSize[position]} ${arrowClasses[position]}`} />
              
              <p className="text-sm font-bn text-foreground leading-relaxed mb-2">
                {tooltip.emoji} {tooltip.text}
              </p>
              <button
                onClick={() => {
                  dismiss(tooltipKey);
                  setVisible(false);
                }}
                className="text-xs font-semibold text-primary hover:underline font-bn"
              >
                বুঝেছি
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeatureTooltip;
