import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Coins, MessageSquare, CreditCard, Loader2 } from 'lucide-react';
import { Mascot } from '@/components/Mascot';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';

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

const PLAN_CARDS = [
  { key: 'starter', name: 'Starter', priceBDT: '৳799', priceUSD: '$19', credits: '5K' },
  { key: 'pro', name: 'Pro', priceBDT: '৳1,999', priceUSD: '$49', credits: '15K' },
  { key: 'agency', name: 'Agency', priceBDT: '৳4,999', priceUSD: '$99', credits: '35K' },
];

const UpgradeModal = ({ open, onClose, type = 'general', creditInfo }: UpgradeModalProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const isAgency = profile?.plan_key === 'agency';
  const actionLabel = creditInfo?.action ? ACTION_LABELS[creditInfo.action] : null;
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const isBD = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Dhaka'; } catch { return false; }
  }, []);
  const currency = isBD ? 'BDT' : 'USD';

  // Compute reset date for paid subscribers
  const isPaidSubscriber = profile?.plan_key && profile.plan_key !== 'free' && profile.subscription_status === 'active';
  const resetDateStr = useMemo(() => {
    if (!isPaidSubscriber || !profile?.credits_reset_at) return null;
    const resetDate = addDays(new Date(profile.credits_reset_at), 30);
    return format(resetDate, 'MMM d, yyyy');
  }, [isPaidSubscriber, profile?.credits_reset_at]);

  const dismissLabel = useMemo(() => {
    if (type !== 'credits') return t('পরে করব', 'Maybe later');
    if (isPaidSubscriber && resetDateStr) return t(`রিসেট হবে ${resetDateStr}`, `Resets on ${resetDateStr}`);
    return t('পরে করব', 'Maybe later');
  }, [type, isPaidSubscriber, resetDateStr, t]);

  const initiateCheckout = async (planKey: string) => {
    setCheckoutLoading(planKey);
    try {
      const isUpgrade = profile?.plan_key && profile.plan_key !== 'free' && profile.plan_key !== planKey;
      const { data, error } = await supabase.functions.invoke('initiate-payment', {
        body: { plan_key: planKey, currency, is_upgrade: isUpgrade },
      });

      if (error) throw error;

      if (data.dev_mode) {
        toast({ title: '✅ ' + t('প্ল্যান সক্রিয়!', 'Plan Activated!'), description: data.message_en });
        await refreshProfile();
        onClose();
      } else if (data.gateway_url) {
        window.location.href = data.gateway_url;
        return;
      }
    } catch (e) {
      console.error('Checkout error:', e);
      toast({ title: t('ত্রুটি', 'Error'), description: t('পেমেন্ট শুরু করতে ব্যর্থ।', 'Failed to initiate payment.'), variant: 'destructive' });
    }
    setCheckoutLoading(null);
  };

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
                <Mascot variant={type === 'credits' ? 'sheepish' : 'worried'} size={80} className="mx-auto" />
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
                  {resetDateStr ? (
                    <p className="text-sm text-muted-foreground">
                      {t(`ক্রেডিট রিসেট হবে ${resetDateStr}`, `Credits reset on ${resetDateStr}`)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('সাবস্ক্রিপশন সক্রিয় করুন', 'Subscribe to get credits')}
                    </p>
                  )}
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
                  {/* Plan comparison with checkout */}
                  <div className="grid grid-cols-3 gap-2">
                    {PLAN_CARDS.map(plan => {
                      const isCurrent = profile?.plan_key === plan.key;
                      const isRecommended = (profile?.plan_key === 'starter' || profile?.plan_key === 'free') && plan.key === 'pro'
                        || profile?.plan_key === 'pro' && plan.key === 'agency';
                      const price = currency === 'BDT' ? plan.priceBDT : plan.priceUSD;

                      return (
                        <div key={plan.key} className={`rounded-2xl border-2 p-3 space-y-1 relative ${
                          isRecommended ? 'border-primary bg-primary/5' : 'border-border bg-secondary/50'
                        }`}>
                          {isRecommended && (
                            <span className="absolute -top-2 right-2 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                              {t('সুপারিশ', 'Best')}
                            </span>
                          )}
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{plan.name}</p>
                          <p className="text-sm font-bold text-foreground">{price}</p>
                          <p className="text-[10px] text-muted-foreground">{plan.credits} {t('ক্রেডিট', 'credits')}</p>
                          {!isCurrent && (
                            <button
                              onClick={() => initiateCheckout(plan.key)}
                              disabled={!!checkoutLoading}
                              className="!mt-2 w-full bg-primary text-primary-foreground rounded-lg py-1 text-[10px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {checkoutLoading === plan.key ? <Loader2 size={10} className="animate-spin" /> : <CreditCard size={10} />}
                              {t('নিন', 'Get')}
                            </button>
                          )}
                          {isCurrent && (
                            <p className="!mt-2 text-[10px] text-center text-primary font-medium">{t('বর্তমান', 'Current')}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <button
                onClick={onClose}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {dismissLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
