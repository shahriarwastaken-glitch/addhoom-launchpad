import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ProcessingStep } from './types';
import { FUN_FACTS } from './types';

interface VideoProcessingProps {
  onCancel: () => void;
  steps: ProcessingStep[];
  elapsedSeconds: number;
}

const VideoProcessing = ({ onCancel, steps, elapsedSeconds }: VideoProcessingProps) => {
  const { t, lang } = useLanguage();
  const [showFact, setShowFact] = useState(false);
  const [factIdx] = useState(() => Math.floor(Math.random() * FUN_FACTS.length));
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowFact(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-64 h-64 rounded-full bg-primary/5 blur-3xl"
          animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
          style={{ top: '10%', left: '10%' }}
        />
        <motion.div
          className="absolute w-48 h-48 rounded-full bg-[#FFB800]/5 blur-3xl"
          animate={{ x: [0, -80, 0], y: [0, 60, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
          style={{ bottom: '20%', right: '10%' }}
        />
      </div>

      {/* Spinning reel */}
      <div className="relative mb-8">
        <motion.div
          className="w-[120px] h-[120px] rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), #FFB800)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <motion.span
            className="text-5xl"
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            🎬
          </motion.span>
        </motion.div>
      </div>

      {/* Progress steps */}
      <div className="space-y-3 mb-6 w-full max-w-xs">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              step.status === 'done'
                ? 'bg-brand-green text-white'
                : step.status === 'active'
                ? 'border-2 border-primary'
                : 'border-2 border-border'
            }`}>
              {step.status === 'done' ? (
                <Check size={12} />
              ) : step.status === 'active' ? (
                <Loader2 size={12} className="text-primary animate-spin" />
              ) : null}
            </div>
            <span className={`text-sm font-heading-bn ${
              step.status === 'active' ? 'text-primary font-semibold' : step.status === 'done' ? 'text-muted-foreground' : 'text-muted-foreground/50'
            }`}>
              {t(step.label, step.labelEn)}
              {step.status === 'active' && <span className="text-xs ml-1 text-primary/70">{t('চলছে...', 'Running...')}</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Status */}
      <p className="text-sm text-muted-foreground font-heading-bn mb-1">
        {t('প্রায় ৩০-৬০ সেকেন্ড লাগবে', 'Takes about 30-60 seconds')}
      </p>
      <p className="text-sm text-muted-foreground font-mono">
        {t('সময় অতিবাহিত:', 'Elapsed:')} {formatTime(elapsedSeconds)}
      </p>

      {/* Fun fact */}
      <AnimatePresence>
        {showFact && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-card rounded-2xl p-5 max-w-sm border border-border"
          >
            <p className="text-[13px] font-heading-bn text-foreground">
              {lang === 'bn' ? FUN_FACTS[factIdx].bn : FUN_FACTS[factIdx].en}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel */}
      <div className="mt-8">
        {!showCancelConfirm ? (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors font-heading-bn"
          >
            {t('বাতিল করুন', 'Cancel')}
          </button>
        ) : (
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-sm font-heading-bn text-foreground mb-3">
              {t('নিশ্চিতভাবে বাতিল করবেন?\nব্যবহৃত ভিডিও কোটা ফেরত আসবে না।', 'Cancel for sure?\nUsed video quota won\'t be refunded.')}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-heading-bn"
              >
                {t('হ্যাঁ বাতিল করুন', 'Yes, cancel')}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-heading-bn"
              >
                {t('না, অপেক্ষা করি', 'No, wait')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoProcessing;
