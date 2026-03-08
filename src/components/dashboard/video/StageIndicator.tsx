import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { VideoStage } from './types';

interface StageIndicatorProps {
  currentStage: VideoStage;
}

const stages = [
  { bn: 'সেটআপ', en: 'Setup' },
  { bn: 'তৈরি হচ্ছে', en: 'Creating' },
  { bn: 'ফলাফল', en: 'Result' },
];

const StageIndicator = ({ currentStage }: StageIndicatorProps) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-center gap-0 py-4 px-6 shrink-0">
      {stages.map((stage, i) => {
        const stepNum = (i + 1) as VideoStage;
        const isCompleted = currentStage > stepNum;
        const isActive = currentStage === stepNum;
        const isUpcoming = currentStage < stepNum;

        return (
          <div key={i} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-brand-green text-white'
                    : isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'border-2 border-border text-muted-foreground'
                }`}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {isCompleted ? <Check size={14} /> : stepNum}
              </motion.div>
              <span
                className={`text-[11px] font-heading-bn whitespace-nowrap ${
                  isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                }`}
              >
                {t(stage.bn, stage.en)}
              </span>
            </div>

            {/* Connector line */}
            {i < 2 && (
              <div className="w-16 sm:w-24 h-0.5 mx-2 mt-[-18px] relative">
                <div className={`absolute inset-0 ${isUpcoming ? 'border-t-2 border-dashed border-border' : ''}`} />
                {!isUpcoming && (
                  <motion.div
                    className="absolute inset-0 bg-primary rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    style={{ transformOrigin: 'left' }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StageIndicator;
