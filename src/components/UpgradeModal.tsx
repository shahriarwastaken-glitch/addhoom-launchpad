import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type UpgradeType = 'video' | 'general';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  type?: UpgradeType;
}

const content: Record<UpgradeType, { icon: string; title_bn: string; title_en: string; desc_bn: string; desc_en: string }> = {
  video: {
    icon: '🎬',
    title_bn: 'ভিডিও লিমিট শেষ হয়েছে',
    title_en: 'Video Limit Reached',
    desc_bn: 'Pro প্ল্যানে মাসে ২টি ভিডিও বিজ্ঞাপন তৈরি করা যায়। Unlimited ভিডিওর জন্য Agency প্ল্যানে যান।',
    desc_en: 'Pro plan allows 2 video ads per month. Upgrade to Agency for unlimited videos.',
  },
  general: {
    icon: '⚡',
    title_bn: 'ফিচার লিমিট শেষ হয়েছে',
    title_en: 'Feature Limit Reached',
    desc_bn: 'এই ফিচারের লিমিট শেষ হয়ে গেছে। আরও ব্যবহারের জন্য আপগ্রেড করুন।',
    desc_en: 'You have reached the limit for this feature. Upgrade for more usage.',
  },
};

const UpgradeModal = ({ open, onClose, type = 'general' }: UpgradeModalProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const c = content[type];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-card rounded-3xl shadow-warm-lg overflow-hidden border border-border"
          >
            {/* Top gradient strip */}
            <div className="bg-gradient-brand px-6 py-4 text-center">
              <h2 className="text-lg font-bold text-primary-foreground">⚡ {t('আপগ্রেড করুন', 'Upgrade')}</h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Icon & description */}
              <div className="text-center space-y-2">
                <span className="text-4xl">{c.icon}</span>
                <h3 className="text-lg font-bold text-foreground">{t(c.title_bn, c.title_en)}</h3>
                <p className="text-sm text-muted-foreground">{t(c.desc_bn, c.desc_en)}</p>
              </div>

              {/* Plan comparison */}
              <div className="grid grid-cols-2 gap-3">
                {/* Pro */}
                <div className="rounded-2xl border border-border p-4 space-y-2 bg-secondary/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pro</p>
                  <p className="text-xl font-bold text-foreground">৳২,৯৯৯<span className="text-xs font-normal text-muted-foreground">/{t('মাস', 'mo')}</span></p>
                  <p className="text-xs text-muted-foreground">{t('২টি ভিডিও/মাস', '2 videos/mo')}</p>
                </div>
                {/* Agency */}
                <div className="rounded-2xl border-2 border-primary p-4 space-y-2 bg-primary/5 relative">
                  <span className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {t('সুপারিশকৃত', 'Recommended')}
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Agency</p>
                  <p className="text-xl font-bold text-foreground">৳৭,৯৯৯<span className="text-xs font-normal text-muted-foreground">/{t('মাস', 'mo')}</span></p>
                  <p className="text-xs text-muted-foreground">{t('Unlimited সব কিছু', 'Unlimited everything')}</p>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => { onClose(); navigate('/pricing'); }}
                className="w-full bg-gradient-cta text-primary-foreground rounded-full py-3 text-sm font-bold shadow-orange-glow hover:opacity-90 transition-opacity"
              >
                {t('Agency তে আপগ্রেড করুন', 'Upgrade to Agency')}
              </button>

              <button
                onClick={onClose}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('পরে করব', 'Maybe later')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
