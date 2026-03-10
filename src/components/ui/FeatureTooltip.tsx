import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeatureTooltips } from '@/hooks/useFeatureTooltips';

type TooltipKey = 'dhoom_score' | 'winner_star' | 'remix_button' | 'calendar_generate';

interface FeatureTooltipProps {
  tooltipKey: TooltipKey;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const GAP_PX = 12;

const FeatureTooltip = ({ tooltipKey, children, position = 'top', className = '' }: FeatureTooltipProps) => {
  const { shouldShow, dismiss, getTooltip } = useFeatureTooltips();
  const [visible, setVisible] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Small delay so the UI renders first
    const timer = window.setTimeout(() => {
      if (shouldShow(tooltipKey)) setVisible(true);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [tooltipKey, shouldShow]);

  useEffect(() => {
    if (!visible) return;

    const update = () => {
      const next = anchorRef.current?.getBoundingClientRect() ?? null;
      setRect(next);
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [visible]);

  const tooltip = useMemo(() => getTooltip(tooltipKey), [getTooltip, tooltipKey]);

  const floatingStyle = useMemo(() => {
    if (!rect) return null;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    switch (position) {
      case 'top':
        return { top: rect.top - GAP_PX, left: centerX, transform: 'translate(-50%, -100%)' };
      case 'bottom':
        return { top: rect.bottom + GAP_PX, left: centerX, transform: 'translate(-50%, 0)' };
      case 'left':
        return { top: centerY, left: rect.left - GAP_PX, transform: 'translate(-100%, -50%)' };
      case 'right':
        return { top: centerY, left: rect.right + GAP_PX, transform: 'translate(0, -50%)' };
      default:
        return { top: rect.top - GAP_PX, left: centerX, transform: 'translate(-50%, -100%)' };
    }
  }, [rect, position]);

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-primary border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-primary border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-primary border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-primary border-y-transparent border-l-transparent',
  };

  if (!visible) return <>{children}</>;

  return (
    <div ref={anchorRef} className={`relative inline-flex ${className}`}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {visible && rect && floatingStyle && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="fixed z-[1000]"
                style={floatingStyle}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="pointer-events-auto bg-card border border-border rounded-xl shadow-warm-lg px-4 py-3 max-w-[260px] relative">
                  <div className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`} />

                  <p className="text-sm font-body-en text-foreground leading-relaxed mb-2 flex items-start gap-1.5">
                    <tooltip.Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {tooltip.text}
                  </p>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dismiss(tooltipKey);
                      setVisible(false);
                    }}
                    className="text-xs font-semibold text-primary hover:underline font-heading-en"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};

export default FeatureTooltip;
