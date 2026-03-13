import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Coins, MessageSquare, CreditCard, Loader2, ArrowRight, Package, ArrowUp, Globe, MapPin, Flame, Sparkles } from 'lucide-react';
import { Mascot } from '@/components/Mascot';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import { trackEvent } from '@/lib/posthog';

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
  'ad_image': { bn: 'ছবি তৈরি করতে', en: 'generate an image' },
  'ad_copy': { bn: 'বিজ্ঞাপন কপি তৈরি করতে', en: 'generate ad copy' },
};

const PLAN_CARDS = [
  { key: 'starter', name: 'Starter', priceBDT: '৳799', priceUSD: '$19', credits: '5,000', creditNum: 5000 },
  { key: 'pro', name: 'Pro', priceBDT: '৳1,999', priceUSD: '$49', credits: '15,000', creditNum: 15000 },
  { key: 'agency', name: 'Agency', priceBDT: '৳4,999', priceUSD: '$99', credits: '35,000', creditNum: 35000 },
];

type CreditPack = {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  price_bdt: number;
  sort_order: number;
};

const PACK_ICONS: Record<string, typeof Zap> = { Small: Zap, Medium: Flame, Large: Sparkles };

const UpgradeModal = ({ open, onClose, type = 'general', creditInfo }: UpgradeModalProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const actionLabel = creditInfo?.action ? ACTION_LABELS[creditInfo.action] : null;
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'buy' | 'upgrade'>('buy');
  const [packs, setPacks] = useState<CreditPack[]>([]);

  const isBD = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Dhaka'; } catch { return false; }
  }, []);
  const [currencyMode, setCurrencyMode] = useState<'intl' | 'bd'>(() => isBD ? 'bd' : 'intl');
  const currency = currencyMode === 'bd' ? 'BDT' : 'USD';

  const isPaidSubscriber = profile?.plan_key && profile.plan_key !== 'free' && profile.subscription_status === 'active';
  const isAgency = profile?.plan_key === 'agency';

  const resetDateStr = useMemo(() => {
    if (!isPaidSubscriber || !profile?.credits_reset_at) return null;
    const resetDate = addDays(new Date(profile.credits_reset_at), 30);
    return format(resetDate, 'MMM d, yyyy');
  }, [isPaidSubscriber, profile?.credits_reset_at]);

  // Fetch credit packs
  useEffect(() => {
    if (!open) return;
    supabase.from('credit_packs').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setPacks(data as any); });
  }, [open]);

  const initiateCheckout = async (planKey: string) => {
    setCheckoutLoading(planKey);
    trackEvent('subscription_checkout_started', {
      plan: planKey,
      currency,
      amount: PLAN_CARDS.find(p => p.key === planKey)?.[currency === 'BDT' ? 'priceBDT' : 'priceUSD'] || '',
    });
    try {
      const isUpgrade = profile?.plan_key && profile.plan_key !== 'free' && profile.plan_key !== planKey;
      const { data, error } = await supabase.functions.invoke('initiate-payment', {
        body: { plan_key: planKey, currency, is_upgrade: isUpgrade },
      });
      if (error) throw error;
      if (data.dev_mode) {
        toast({ title: '✅ ' + t('প্ল্যান সক্রিয়!', 'Plan Activated!'), description: data.message_en });
        trackEvent('subscription_payment_success', { plan: planKey, currency, amount: 0, is_upgrade: !!isUpgrade });
        trackEvent('paywall_converted', { type: showSubscriptionModal ? 'unsubscribed' : 'out_of_credits', action: isUpgrade ? 'upgraded' : 'subscribed' });
        await refreshProfile();
        onClose();
      } else if (data.gateway_url) {
        window.location.href = data.gateway_url;
        return;
      }
    } catch (e) {
      console.error('Checkout error:', e);
      trackEvent('subscription_payment_failed', { plan: planKey, currency });
      toast({ title: t('ত্রুটি', 'Error'), description: t('পেমেন্ট শুরু করতে ব্যর্থ।', 'Failed to initiate payment.'), variant: 'destructive' });
    }
    setCheckoutLoading(null);
  };

  const initiatePackPurchase = async (packId: string) => {
    setCheckoutLoading(packId);
    const pack = packs.find(p => p.id === packId);
    trackEvent('credit_pack_checkout_started', {
      pack: pack?.name?.toLowerCase() || 'unknown',
      currency,
      amount: pack ? (currency === 'BDT' ? pack.price_bdt : pack.price_usd) : 0,
      credits: pack?.credits || 0,
    });
    try {
      const { data, error } = await supabase.functions.invoke('initiate-credit-pack-payment', {
        body: { pack_id: packId, currency },
      });
      if (error) throw error;
      if (data.gateway_url) {
        window.location.href = data.gateway_url;
        return;
      }
    } catch (e: any) {
      console.error('Pack purchase error:', e);
      const msg = e?.message || '';
      if (msg.includes('subscription')) {
        toast({ title: t('ত্রুটি', 'Error'), description: t('ক্রেডিট প্যাক কিনতে সাবস্ক্রিপশন প্রয়োজন।', 'Active subscription required.'), variant: 'destructive' });
      } else {
        toast({ title: t('ত্রুটি', 'Error'), description: t('পেমেন্ট শুরু করতে ব্যর্থ।', 'Failed to initiate payment.'), variant: 'destructive' });
      }
    }
    setCheckoutLoading(null);
  };

  // ── GATE LOGIC ──
  const showSubscriptionModal = !isPaidSubscriber;
  const showCreditsModal = isPaidSubscriber && type === 'credits';
  // Track paywall_shown when modal opens
  useEffect(() => {
    if (!open) return;
    trackEvent('paywall_shown', {
      type: !isPaidSubscriber ? 'unsubscribed' : 'out_of_credits',
      feature: creditInfo?.action || 'unknown',
      credits_required: creditInfo?.required || 0,
    });
  }, [open]);

  const CurrencyToggle = () => (
    <div className="flex justify-center">
      <div className="inline-flex bg-muted rounded-full p-1">
        <button
          onClick={() => setCurrencyMode('intl')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${currencyMode === 'intl' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        ><Globe size={12} /> International</button>
        <button
          onClick={() => setCurrencyMode('bd')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${currencyMode === 'bd' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        ><MapPin size={12} /> Bangladesh</button>
      </div>
    </div>
  );

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
            className="relative w-full max-w-[480px] bg-card rounded-3xl shadow-warm-lg overflow-hidden border border-border max-h-[90vh] overflow-y-auto"
          >
            {showSubscriptionModal ? (
              /* ─── SUBSCRIPTION MODAL (unsubscribed users) ─── */
              <div>
                <div className="p-6 text-center space-y-4">
                  <Mascot variant="sheepish" size={80} className="mx-auto" />
                  <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {t('সাবস্ক্রাইব করে শুরু করুন', 'Subscribe to start creating')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('একটি প্ল্যান বেছে নিন এবং আপনার মাসিক ক্রেডিট পান।', 'Choose a plan to get your monthly credits and start generating.')}
                  </p>
                </div>

                <div className="mb-4"><CurrencyToggle /></div>

                <div className="px-6 pb-2 space-y-2.5">
                  {PLAN_CARDS.map(plan => {
                    const isRecommended = plan.key === 'pro';
                    const price = currency === 'BDT' ? plan.priceBDT : plan.priceUSD;
                    return (
                      <div key={plan.key} className={`rounded-2xl border-2 p-4 flex items-center justify-between ${isRecommended ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{plan.name}</p>
                            {isRecommended && <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{t('জনপ্রিয়', 'Popular')}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{plan.credits} {t('ক্রেডিট/মাস', 'credits/mo')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{price}</p>
                          <button
                            onClick={() => initiateCheckout(plan.key)}
                            disabled={!!checkoutLoading}
                            className="mt-1 bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {checkoutLoading === plan.key ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
                            {t('সাবস্ক্রাইব', 'Subscribe')} <ArrowRight size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-6 pt-3">
                  <button onClick={() => { trackEvent('paywall_dismissed', { type: 'unsubscribed', action: 'later' }); onClose(); }} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {t('পরে করব', 'Maybe later')}
                  </button>
                </div>
              </div>
            ) : showCreditsModal ? (
              /* ─── OUT OF CREDITS MODAL (subscribed users) ─── */
              <div>
                {/* Header strip */}
                <div className="px-6 py-5 text-center" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--brand-yellow)))' }}>
                  <Mascot variant="sheepish" size={56} className="mx-auto mb-2" />
                  <h2 className="text-lg font-bold text-primary-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {t('ক্রেডিট শেষ হয়ে গেছে', "You're out of credits")}
                  </h2>
                  <p className="text-xs text-primary-foreground/80 mt-1">
                    {t('আপনার ব্যালেন্স:', 'Your balance:')} {(creditInfo?.balance ?? 0).toLocaleString()} {t('ক্রেডিট', 'credits')}
                  </p>
                </div>

                {/* Tab bar */}
                <div className="bg-muted/50 px-2 py-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setActiveTab('buy')}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'buy' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                    >
                      <Zap size={14} /> {t('ক্রেডিট কিনুন', 'Buy Credits')}
                    </button>
                    <button
                      onClick={() => setActiveTab('upgrade')}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTab === 'upgrade' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                    >
                      <ArrowUp size={14} /> {t('আপগ্রেড', 'Upgrade Plan')}
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {activeTab === 'buy' ? (
                    /* ── BUY CREDITS TAB ── */
                    <div className="space-y-4">
                      <CurrencyToggle />

                      {/* Pack cards */}
                      <div className="space-y-2.5">
                        {packs.map(pack => {
                          const isPopular = pack.name === 'Medium';
                          const price = currency === 'BDT' ? `৳${pack.price_bdt.toLocaleString()}` : `$${pack.price_usd}`;
                          const imgCount = Math.floor(pack.credits / 125);
                          const vidCount = Math.floor(pack.credits / 330);
                          const PackIcon = PACK_ICONS[pack.name] || Zap;
                          return (
                            <div key={pack.id} className={`rounded-2xl border-2 p-4 flex items-center justify-between transition-colors ${isPopular ? 'border-primary bg-primary/5' : 'border-border'}`}>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-[15px] font-bold text-foreground flex items-center gap-1.5" style={{ fontFamily: 'Syne, sans-serif' }}>
                                    <PackIcon size={14} className="text-primary" /> {pack.name}
                                  </p>
                                  {isPopular && <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{t('জনপ্রিয়', 'Most Popular')}</span>}
                                </div>
                                <p className="text-[13px] text-muted-foreground mt-0.5">{pack.credits.toLocaleString()} {t('ক্রেডিট', 'credits')}</p>
                                <p className="text-xs text-muted-foreground">~{imgCount} {t('ছবি', 'images')} · ~{vidCount} {t('ভিডিও', 'videos')}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{price}</p>
                                <button
                                  onClick={() => initiatePackPurchase(pack.id)}
                                  disabled={!!checkoutLoading}
                                  className="mt-1 bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {checkoutLoading === pack.id ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
                                  {t('কিনুন', 'Buy')} <ArrowRight size={10} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-xs text-muted-foreground text-center">
                        {t('ক্রেডিট কখনো মেয়াদোত্তীর্ণ হয় না এবং আপনার সাবস্ক্রিপশনের উপরে যোগ হয়।', 'Credits never expire and stack on top of your subscription.')}
                      </p>

                      {resetDateStr && (
                        <p className="text-xs text-muted-foreground text-center">
                          {t(`অথবা অপেক্ষা করুন — রিসেট হবে ${resetDateStr}`, `Or wait — resets on ${resetDateStr}`)}
                        </p>
                      )}
                    </div>
                  ) : (
                    /* ── UPGRADE PLAN TAB ── */
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground text-center mb-4">
                        {t('প্রতি মাসে আরও ক্রেডিট পান', 'Get more credits every month')}
                      </p>

                      <CurrencyToggle />

                      <div className="space-y-2.5">
                        {PLAN_CARDS.map(plan => {
                          const isCurrent = profile?.plan_key === plan.key;
                          const isRecommended = !isCurrent && (
                            (profile?.plan_key === 'starter' && plan.key === 'pro') ||
                            (profile?.plan_key === 'pro' && plan.key === 'agency')
                          );
                          const price = currency === 'BDT' ? plan.priceBDT : plan.priceUSD;
                          return (
                            <div key={plan.key} className={`rounded-2xl border-2 p-4 flex items-center justify-between ${isCurrent ? 'border-border bg-muted/30 opacity-60' : isRecommended ? 'border-primary bg-primary/5' : 'border-border'}`}>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{plan.name}</p>
                                  {isRecommended && <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{t('জনপ্রিয়', 'Popular')}</span>}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{plan.credits} {t('ক্রেডিট/মাস', 'credits/mo')}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{price}</p>
                                {isCurrent ? (
                                  <span className="text-xs text-primary font-medium">{t('বর্তমান প্ল্যান', 'Current Plan')}</span>
                                ) : (
                                  <button
                                    onClick={() => initiateCheckout(plan.key)}
                                    disabled={!!checkoutLoading}
                                    className="mt-1 bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {checkoutLoading === plan.key ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
                                    {t('আপগ্রেড', 'Upgrade')} <ArrowRight size={10} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-xs text-muted-foreground text-center">
                        {t('ক্রেডিট পেমেন্টের ৩০ দিন পর রিসেট হয়।', 'Credits reset 30 days after payment.')}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={onClose}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
                  >
                    {isPaidSubscriber && resetDateStr
                      ? t(`রিসেট হবে ${resetDateStr}`, `Resets on ${resetDateStr}`)
                      : t('পরে করব', 'Maybe later')
                    }
                  </button>
                </div>
              </div>
            ) : (
              /* ─── GENERAL UPGRADE MODAL (subscribed, non-credits trigger) ─── */
              <div>
                <div className="px-6 py-4 text-center" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--brand-yellow)))' }}>
                  <h2 className="text-lg font-bold text-primary-foreground flex items-center justify-center gap-2">
                    <Zap size={18} />
                    {t('আপগ্রেড করুন', 'Upgrade')}
                  </h2>
                </div>
                <div className="p-6 space-y-5">
                  <div className="text-center space-y-2">
                    <Mascot variant="worried" size={80} className="mx-auto" />
                    <h3 className="text-lg font-bold text-foreground">
                      {t('ফিচার লিমিট শেষ হয়েছে', 'Feature Limit Reached')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('আরও ব্যবহারের জন্য আপগ্রেড করুন।', 'Upgrade your plan to keep creating.')}
                    </p>
                  </div>

                  {isAgency ? (
                    <div className="text-center space-y-3">
                      {resetDateStr && (
                        <p className="text-sm text-muted-foreground">
                          {t(`ক্রেডিট রিসেট হবে ${resetDateStr}`, `Credits reset on ${resetDateStr}`)}
                        </p>
                      )}
                      <a href="https://wa.me/8801234567890" target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                        <MessageSquare size={14} />
                        {t('আরও চাই? WhatsApp এ যোগাযোগ করুন →', 'Need more? Contact us on WhatsApp →')}
                      </a>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {PLAN_CARDS.map(plan => {
                        const isCurrent = profile?.plan_key === plan.key;
                        const price = currency === 'BDT' ? plan.priceBDT : plan.priceUSD;
                        return (
                          <div key={plan.key} className={`rounded-2xl border-2 p-3 space-y-1 relative ${isCurrent ? 'border-primary bg-primary/5' : 'border-border bg-secondary/50'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{plan.name}</p>
                            <p className="text-sm font-bold text-foreground">{price}</p>
                            <p className="text-[10px] text-muted-foreground">{plan.credits} {t('ক্রেডিট', 'credits')}</p>
                            {!isCurrent ? (
                              <button onClick={() => initiateCheckout(plan.key)} disabled={!!checkoutLoading}
                                className="!mt-2 w-full bg-primary text-primary-foreground rounded-lg py-1 text-[10px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                                {checkoutLoading === plan.key ? <Loader2 size={10} className="animate-spin" /> : <CreditCard size={10} />}
                                {t('নিন', 'Get')}
                              </button>
                            ) : (
                              <p className="!mt-2 text-[10px] text-center text-primary font-medium">{t('বর্তমান', 'Current')}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button onClick={onClose} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {isPaidSubscriber && resetDateStr ? t(`রিসেট হবে ${resetDateStr}`, `Resets on ${resetDateStr}`) : t('পরে করব', 'Maybe later')}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
