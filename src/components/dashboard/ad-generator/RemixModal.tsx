import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Smile, Briefcase, Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FRAMEWORKS } from './types';
import type { AdResult } from './types';

interface RemixModalProps {
  ad: AdResult;
  onClose: () => void;
  onRemix: (options: { learnFromWinners: boolean; framework?: string; tone?: string }) => void;
  remixing: boolean;
}

const RemixModal = ({ ad, onClose, onRemix, remixing }: RemixModalProps) => {
  const { t } = useLanguage();
  const [learnFromWinners, setLearnFromWinners] = useState(true);
  const [changeFramework, setChangeFramework] = useState(false);
  const [changeTone, setChangeTone] = useState(false);
  const [framework, setFramework] = useState(ad.framework);
  const [tone, setTone] = useState('friendly');

  const toneOptions = [
    { value: 'friendly', label: t('বন্ধুত্বপূর্ণ', 'Friendly'), icon: <Smile size={14} /> },
    { value: 'professional', label: t('পেশাদার', 'Professional'), icon: <Briefcase size={14} /> },
    { value: 'aggressive', label: t('আক্রমণাত্মক', 'Aggressive'), icon: <Flame size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="relative bg-card rounded-[20px] max-w-[480px] w-full p-6 shadow-warm-lg border border-border z-10"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>

        <h3 className="text-lg font-bold font-heading-bn text-foreground mb-1 flex items-center gap-2">
          <RefreshCw size={18} className="text-primary" /> {t('বিজ্ঞাপন রিমিক্স করুন', 'Remix Ad')}
        </h3>
        <p className="text-sm text-muted-foreground font-heading-bn mb-4">{t('বিজয়ী বিজ্ঞাপনের প্যাটার্ন শিখে আরো ভালো করুন', 'Learn from winning ad patterns to improve')}</p>

        {/* Original ad preview */}
        <div className="bg-secondary rounded-xl p-3 mb-4">
          <p className="text-sm font-heading-bn text-muted-foreground line-clamp-2">{ad.headline}</p>
          <span className="text-xs font-mono text-muted-foreground">Score: {ad.dhoom_score}</span>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={learnFromWinners} onChange={e => setLearnFromWinners(e.target.checked)} className="mt-1 accent-[hsl(var(--primary))]" />
            <div>
              <p className="text-sm font-semibold font-heading-bn text-foreground">{t('বিজয়ী বিজ্ঞাপন থেকে শিখুন', 'Learn from winners')}</p>
              <p className="text-xs text-muted-foreground font-heading-bn">{t('আপনার সেরা বিজ্ঞাপনগুলোর প্যাটার্ন ব্যবহার করবে', 'Will use patterns from your best performing ads')}</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={changeFramework} onChange={e => setChangeFramework(e.target.checked)} className="mt-1 accent-[hsl(var(--primary))]" />
            <div>
              <p className="text-sm font-semibold font-heading-bn text-foreground">{t('ফ্রেমওয়ার্ক পরিবর্তন করুন', 'Change framework')}</p>
              {changeFramework && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {FRAMEWORKS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFramework(f.value)}
                      className={`px-2.5 py-1 rounded-full text-[12px] font-heading-bn border transition-colors ${
                        framework === f.value ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground'
                      }`}
                    >
                      {t(f.label, f.labelEn)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={changeTone} onChange={e => setChangeTone(e.target.checked)} className="mt-1 accent-[hsl(var(--primary))]" />
            <div>
              <p className="text-sm font-semibold font-heading-bn text-foreground">{t('টোন পরিবর্তন করুন', 'Change tone')}</p>
              {changeTone && (
                <div className="flex gap-1.5 mt-2">
                  {toneOptions.map(tn => (
                    <button
                      key={tn.value}
                      onClick={() => setTone(tn.value)}
                      className={`px-2.5 py-1 rounded-full text-[12px] font-heading-bn border transition-colors flex items-center gap-1 ${
                        tone === tn.value ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground'
                      }`}
                    >
                      {tn.icon} {tn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>
        </div>

        <button
          onClick={() => onRemix({
            learnFromWinners,
            framework: changeFramework ? framework : undefined,
            tone: changeTone ? tone : undefined,
          })}
          disabled={remixing}
          className="w-full h-11 rounded-[14px] bg-primary text-primary-foreground font-bold font-heading-bn text-[15px] hover:brightness-110 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {remixing ? <><RefreshCw size={16} className="animate-spin" /> {t('রিমিক্স হচ্ছে...', 'Remixing...')}</> : t('রিমিক্স করুন', 'Remix')}
        </button>
      </motion.div>
    </div>
  );
};

export default RemixModal;
