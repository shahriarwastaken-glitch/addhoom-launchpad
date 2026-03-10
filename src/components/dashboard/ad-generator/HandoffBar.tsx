import { Check, ImageIcon, Calendar, ArrowRight, PartyPopper } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { GeneratorMode } from './types';

interface HandoffBarProps {
  mode: GeneratorMode;
  hasResults: boolean;
  isScheduled: boolean;
  hasImage: boolean;
  onCreateImage: () => void;
}

const HandoffBar = ({ mode, hasResults, isScheduled, hasImage, onCreateImage }: HandoffBarProps) => {
  const { t } = useLanguage();

  if (!hasResults) return null;

  // Determine step states
  const copyDone = hasResults && mode === 'image' ? true : hasResults;
  const imageDone = hasImage;
  const scheduleDone = isScheduled;
  const allDone = copyDone && imageDone && scheduleDone;

  const steps = [
    { label: t('কপি তৈরি', 'Copy'), done: copyDone, icon: Check, current: !copyDone },
    { label: t('ছবি বানান', 'Image'), done: imageDone, icon: ImageIcon, current: copyDone && !imageDone },
    { label: t('শিডিউল', 'Schedule'), done: scheduleDone, icon: Calendar, current: copyDone && imageDone && !scheduleDone },
  ];

  return (
    <div
      className={`shrink-0 border-t px-4 lg:px-6 py-3 flex items-center justify-between gap-3 z-10 transition-colors ${
        allDone
          ? 'bg-[hsl(var(--brand-green))]/[0.04] border-[hsl(var(--brand-green))]'
          : 'bg-card border-border'
      }`}
    >
      {/* Left label */}
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-heading-bn hidden sm:block">
        {allDone ? '🎉' : t('পরবর্তী ধাপ:', 'Next step:')}
      </span>

      {/* Center: Step indicators */}
      <div className="flex items-center gap-1.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <ArrowRight size={10} className="text-muted-foreground/40" />}
            <div className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                step.done
                  ? 'bg-[hsl(var(--brand-green))] text-white'
                  : step.current
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-dashed border-muted-foreground/40'
              }`}>
                {step.done ? <Check size={9} /> : null}
              </div>
              <span className={`text-[11px] font-heading-bn ${
                step.done ? 'text-muted-foreground line-through' : step.current ? 'text-foreground font-bold' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Right: Action button */}
      {allDone ? (
        <span className="text-xs font-heading-bn font-semibold text-[hsl(var(--brand-green))]">
          {t('✓ সব প্রস্তুত!', '✓ All ready!')}
        </span>
      ) : mode === 'copy' && !imageDone ? (
        <button
          onClick={onCreateImage}
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-heading-bn font-semibold hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-1.5"
        >
          <ImageIcon size={12} />
          {t('ছবি বানান →', 'Create Image →')}
        </button>
      ) : (
        <div />
      )}
    </div>
  );
};

export default HandoffBar;
