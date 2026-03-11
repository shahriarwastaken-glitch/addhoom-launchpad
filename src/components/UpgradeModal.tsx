import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Coins, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type UpgradeType = 'video' | 'general' | 'credits';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  type?: UpgradeType;
  creditInfo?: { balance?: number; required?: number; action?: string };
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
    icon: 'zap',
    title_bn: 'ফিচার লিমিট শেষ হয়েছে',
    title_en: 'Feature Limit Reached',
    desc_bn: 'এই ফিচারের লিমিট শেষ হয়ে গেছে। আরও ব্যবহারের জন্য আপগ্রেড করুন।',
    desc_en: 'You have reached the limit for this feature. Upgrade for more usage.',
  },
  credits: {
    icon: '💳',
    title_bn: 'ক্রেডিট শেষ হয়ে গেছে',
    title_en: "You're out of credits",
    desc_bn: 'আপনার ক্রেডিট শেষ। আরও তৈরি করতে আপগ্রেড করুন।',
    desc_en: 'Upgrade your plan to keep creating.',
  },
};

const UpgradeModal = ({ open, onClose, type = 'general', creditInfo }: UpgradeModalProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const c = content[type];
  const isAgency = profile?.plan_key === 'agency';

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
          <div className="absolute inset-0 bg-black/60" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-card rounded-3xl shadow-warm-lg overflow-hidden border border-border"
          >
            <div className="bg-gradient-brand px-6 py-4 text-center">
              <h2 className="text-lg font-bold text-primary-foreground flex items-center justify-center gap-2">
                {type === 'credits' ? <Coins size={18} /> : <Zap size={18} />}
                {type === 'credits' ? t('ক্রেডিট শেষ', 'Out of Credits') : t('আপগ্রেড করুন', 'Upgrade')}
              </h2>
            </div>

            <div className="p-6 space-y-5">
              <div className="text-center space-y-2">
                <span className="text-4xl">{c.icon}</span>
                <h3 className="text-lg font-bold text-foreground">{t(c.title_bn, c.title_en)}</h3>
                <p className="text-sm text-muted-foreground">{t(c.desc_bn, c.desc_en)}</p>
              </div>

              {/* Credit info */}
              {type === 'credits' && creditInfo && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('আপনার ব্যালেন্স:', 'Your balance:')} <span className="font-bold text-foreground">{(creditInfo.balance ?? 0).toLocaleString()} {t('ক্রেডিট', 'credits')}</span>
                  </p>
                  {creditInfo.required && (
                    <p className="text-xs text-muted-foreground">
                      {t('প্রয়োজন:', 'Required:')} <span className="font-medium">{creditInfo.required.toLocaleString()} {t('ক্রেডিট', 'credits')}</span>
                    </p>
                  )}
                </div>
              )}

              {isAgency ? (
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('আপনার ক্রেডিট শীঘ্রই রিসেট হবে', 'Your credits will reset soon')}
                  </p>
                  <a
                    href="https://wa.me/8801234567890"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <MessageSquare size={14} />
                    {t('আরও চাই? WhatsApp এ যোগাযোগ করুন →', 'Need more? Contact us on WhatsApp →')}
                  </a>
                </div>
              ) : (
                <>
                  {/* Plan comparison */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-border p-3 space-y-1 bg-secondary/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Starter</p>
                      <p className="text-sm font-bold text-foreground">5K</p>
                      <p className="text-[10px] text-muted-foreground">{t('ক্রেডিট', 'credits')}</p>
                    </div>
                    <div className={`rounded-2xl border-2 p-3 space-y-1 relative ${
                      profile?.plan_key === 'starter' ? 'border-primary bg-primary/5' : 'border-border bg-secondary/50'
                    }`}>
                      {profile?.plan_key === 'starter' && (
                        <span className="absolute -top-2 right-2 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                          {t('সুপারিশ', 'Best')}
                        </span>
                      )}
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Pro</p>
                      <p className="text-sm font-bold text-foreground">15K</p>
                      <p className="text-[10px] text-muted-foreground">{t('ক্রেডিট', 'credits')}</p>
                    </div>
                    <div className={`rounded-2xl border-2 p-3 space-y-1 relative ${
                      profile?.plan_key === 'pro' ? 'border-primary bg-primary/5' : 'border-border bg-secondary/50'
                    }`}>
                      {profile?.plan_key === 'pro' && (
                        <span className="absolute -top-2 right-2 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                          {t('সুপারিশ', 'Best')}
                        </span>
                      )}
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Agency</p>
                      <p className="text-sm font-bold text-foreground">35K</p>
                      <p className="text-[10px] text-muted-foreground">{t('ক্রেডিট', 'credits')}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => { onClose(); navigate('/pricing'); }}
                    className="w-full bg-gradient-cta text-primary-foreground rounded-full py-3 text-sm font-bold shadow-orange-glow hover:opacity-90 transition-opacity"
                  >
                    {t('আপগ্রেড করুন →', 'Upgrade Now →')}
                  </button>
                </>
              )}

              <button
                onClick={onClose}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {type === 'credits' 
                  ? t('রিসেটের জন্য অপেক্ষা করব', "I'll wait for reset")
                  : t('পরে করব', 'Maybe later')
                }
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
