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

const ACTION_LABELS: Record<string, { bn: string; en: string }> = {
  'image_generation': { bn: 'ছবি তৈরি করতে', en: 'generate an image' },
  'video_generation': { bn: 'ভিডিও তৈরি করতে', en: 'generate a video' },
  'ad_copy': { bn: 'বিজ্ঞাপন কপি তৈরি করতে', en: 'generate ad copy' },
  'prompt_enhance': { bn: 'প্রম্পট উন্নত করতে', en: 'enhance this prompt' },
  'upscale': { bn: 'ইমেজ আপস্কেল করতে', en: 'upscale this image' },
  'tryon': { bn: 'ট্রাই-অন তৈরি করতে', en: 'generate a try-on' },
  'content_calendar': { bn: 'কনটেন্ট ক্যালেন্ডার তৈরি করতে', en: 'generate your content calendar' },
  'account_doctor': { bn: 'অ্যাকাউন্ট ডাক্তার চালাতে', en: 'run Account Doctor' },
  'generate-ad-image': { bn: 'ছবি তৈরি করতে', en: 'generate an image' },
  'generate-ai-video': { bn: 'ভিডিও তৈরি করতে', en: 'generate a video' },
  'generate-ads': { bn: 'বিজ্ঞাপন কপি তৈরি করতে', en: 'generate ad copy' },
  'enhance-prompt': { bn: 'প্রম্পট উন্নত করতে', en: 'enhance this prompt' },
  'upscale-image': { bn: 'ইমেজ আপস্কেল করতে', en: 'upscale this image' },
  'generate-tryon': { bn: 'ট্রাই-অন তৈরি করতে', en: 'generate a try-on' },
  'generate-content-calendar': { bn: 'কনটেন্ট ক্যালেন্ডার তৈরি করতে', en: 'generate your content calendar' },
  'account-doctor': { bn: 'অ্যাকাউন্ট ডাক্তার চালাতে', en: 'run Account Doctor' },
  'generate-product-photo': { bn: 'প্রোডাক্ট ফটো তৈরি করতে', en: 'generate a product photo' },
  'remix-image-fresh': { bn: 'ইমেজ রিমিক্স করতে', en: 'remix this image' },
};

const UpgradeModal = ({ open, onClose, type = 'general', creditInfo }: UpgradeModalProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAgency = profile?.plan_key === 'agency';
  const actionLabel = creditInfo?.action ? ACTION_LABELS[creditInfo.action] : null;

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
                <span className="text-4xl">{type === 'credits' ? '💳' : '⚡'}</span>
                <h3 className="text-lg font-bold text-foreground">
                  {type === 'credits'
                    ? t('ক্রেডিট শেষ হয়ে গেছে', "You're out of credits")
                    : t('ফিচার লিমিট শেষ হয়েছে', 'Feature Limit Reached')
                  }
                </h3>
                {type === 'credits' && actionLabel ? (
                  <p className="text-sm text-muted-foreground">
                    {t(
                      `${actionLabel.bn} ${creditInfo?.required?.toLocaleString() || ''} ক্রেডিট প্রয়োজন`,
                      `You need ${creditInfo?.required?.toLocaleString() || ''} credits to ${actionLabel.en}`
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('আরও ব্যবহারের জন্য আপগ্রেড করুন।', 'Upgrade your plan to keep creating.')}
                  </p>
                )}
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
