import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUpgrade } from '@/contexts/UpgradeContext';
import { supabase } from '@/integrations/supabase/client';
import { Zap, ArrowRight, Loader2, CreditCard, AlertTriangle, CheckCircle2, RotateCcw, Package, Globe, MapPin, Flame, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { Mascot } from '@/components/Mascot';
import { trackEvent } from '@/lib/posthog';

type CreditPack = {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  price_bdt: number;
  sort_order: number;
};

type PackPurchase = {
  id: string;
  credits: number;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  credit_packs: { name: string } | null;
};

const PACK_ICONS: Record<string, typeof Zap> = { Small: Zap, Medium: Flame, Large: Sparkles };

const BillingTab = () => {
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const { showUpgrade } = useUpgrade();

  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);

  // Credit packs
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [packPurchases, setPackPurchases] = useState<PackPurchase[]>([]);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [packCheckoutLoading, setPackCheckoutLoading] = useState<string | null>(null);

  const planKey = profile?.plan_key || 'free';
  const isPaidSubscriber = planKey !== 'free' && profile?.subscription_status === 'active';
  const planCredits = useMemo(() => {
    if (planKey === 'agency') return 35000;
    if (planKey === 'pro') return 15000;
    if (planKey === 'starter') return 5000;
    return 0;
  }, [planKey]);
  const creditBalance = profile?.credit_balance ?? 0;
  const creditPct = planCredits > 0 ? Math.round(((planCredits - creditBalance) / planCredits) * 100) : 0;
  const resetDate = useMemo(() => {
    if (!profile?.credits_reset_at) return null;
    return new Date(profile.credits_reset_at);
  }, [profile?.credits_reset_at]);

  const isBD = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Dhaka'; } catch { return false; }
  }, []);
  const [currencyMode, setCurrencyMode] = useState<'intl' | 'bd'>(() => isBD ? 'bd' : 'intl');
  const currency = currencyMode === 'bd' ? 'BDT' : 'USD';

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [{ data: sub }, { data: history }, { data: packsData }, { data: purchases }] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
        supabase.from('billing_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('credit_packs').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('credit_pack_purchases').select('*, credit_packs(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ]);
      setSubscription(sub);
      setBillingHistory(history || []);
      setPacks((packsData || []) as any);
      setPackPurchases((purchases || []) as any);
      setLoading(false);
    };
    load();
  }, [user]);

  // Check URL params for payment result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'failed') {
      toast({ title: t('পেমেন্ট ব্যর্থ', 'Payment Failed'), description: t('আবার চেষ্টা করুন।', 'Please try again.'), variant: 'destructive' });
    } else if (payment === 'cancelled') {
      toast({ title: t('পেমেন্ট বাতিল', 'Payment Cancelled'), description: t('পেমেন্ট বাতিল করা হয়েছে।', 'Payment was cancelled.') });
    }
    if (payment) {
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const initiateCheckout = async (targetPlanKey: string) => {
    setCheckoutLoading(targetPlanKey);
    try {
      const isUpgrade = planKey !== 'free' && planKey !== targetPlanKey;
      const { data, error } = await supabase.functions.invoke('initiate-payment', {
        body: { plan_key: targetPlanKey, currency, is_upgrade: isUpgrade },
      });
      if (error) throw error;
      if (data.dev_mode) {
        toast({ title: '✅ ' + t('প্ল্যান সক্রিয়!', 'Plan Activated!'), description: data.message_en });
        await refreshProfile();
        const [{ data: sub }, { data: history }] = await Promise.all([
          supabase.from('subscriptions').select('*').eq('user_id', user!.id).eq('status', 'active').maybeSingle(),
          supabase.from('billing_history').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10),
        ]);
        setSubscription(sub);
        setBillingHistory(history || []);
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

  const initiatePackPurchase = async (packId: string) => {
    if (!isPaidSubscriber) {
      showUpgrade('general');
      return;
    }
    setPackCheckoutLoading(packId);
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
      toast({ title: t('ত্রুটি', 'Error'), description: t('পেমেন্ট শুরু করতে ব্যর্থ।', 'Failed to initiate payment.'), variant: 'destructive' });
    }
    setPackCheckoutLoading(null);
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { reason: cancelReason },
      });
      if (error) throw error;
      trackEvent('subscription_cancelled', { plan: planKey, reason: cancelReason });
      toast({ title: t('সাবস্ক্রিপশন বাতিল হয়েছে', 'Subscription Cancelled'), description: t(`অ্যাক্সেস চলবে ${data.access_until ? format(new Date(data.access_until), 'MMM d, yyyy') : ''} পর্যন্ত`, `Access continues until ${data.access_until ? format(new Date(data.access_until), 'MMM d, yyyy') : ''}`) });
      setShowCancelModal(false);
      const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', user!.id).eq('status', 'active').maybeSingle();
      setSubscription(sub);
    } catch (e) {
      console.error('Cancel error:', e);
      toast({ title: t('ত্রুটি', 'Error'), description: t('বাতিল করতে ব্যর্থ।', 'Failed to cancel.'), variant: 'destructive' });
    }
    setCancelLoading(false);
  };

  const handleReactivate = async () => {
    setReactivateLoading(true);
    try {
      const { error } = await supabase.functions.invoke('reactivate-subscription', { body: {} });
      if (error) throw error;
      toast({ title: '✅ ' + t('পুনরায় সক্রিয়!', 'Reactivated!'), description: t('আপনার সাবস্ক্রিপশন আবার সক্রিয়।', 'Your subscription is active again.') });
      const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', user!.id).eq('status', 'active').maybeSingle();
      setSubscription(sub);
    } catch (e) {
      toast({ title: t('ত্রুটি', 'Error'), description: t('পুনরায় সক্রিয় করতে ব্যর্থ।', 'Failed to reactivate.'), variant: 'destructive' });
    }
    setReactivateLoading(false);
  };

  const PLAN_CARDS = [
    { key: 'starter', name: 'Starter', priceBDT: '৳799', priceUSD: '$19', credits: '5,000' },
    { key: 'pro', name: 'Pro', priceBDT: '৳1,999', priceUSD: '$49', credits: '15,000' },
    { key: 'agency', name: 'Agency', priceBDT: '৳4,999', priceUSD: '$99', credits: '35,000' },
  ];

  const paidPurchases = packPurchases.filter(p => p.status === 'paid');

  return (
    <div className="space-y-6">
      {/* Past-due renewal banner */}
      {profile?.subscription_status === 'past_due' && (
        <div className="bg-[hsl(var(--brand-yellow))]/10 border border-[hsl(var(--brand-yellow))]/20 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-[hsl(var(--brand-yellow))] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{t('সাবস্ক্রিপশনের মেয়াদ শেষ', 'Subscription Expired')}</p>
            <p className="text-xs text-muted-foreground">{t('ক্রেডিট ব্যবহার করতে এখনই রিনিউ করুন।', 'Renew now to keep using your credits.')}</p>
          </div>
          <button onClick={() => initiateCheckout(planKey)} className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5">
            {checkoutLoading === planKey ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            {t('রিনিউ করুন', 'Renew Now')}
          </button>
        </div>
      )}

      {/* Current Plan */}
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">{t('বর্তমান প্ল্যান', 'Current Plan')}</h3>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            {profile?.plan || 'Free'}
          </span>
          {profile?.subscription_status === 'active' && (
            <span className="text-xs text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 size={10} /> {t('সক্রিয়', 'Active')}
            </span>
          )}
        </div>
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5"><Zap size={14} /> {t('ক্রেডিট', 'Credits')}</span>
            <span className="font-semibold text-foreground">{creditBalance.toLocaleString()} / {planCredits.toLocaleString()}</span>
          </div>
          <Progress value={creditPct} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{creditPct}% {t('ব্যবহৃত', 'used')}</span>
            {resetDate && <span>{t(`রিসেট হবে ${format(resetDate, 'MMM d, yyyy')}`, `Resets on ${format(resetDate, 'MMM d, yyyy')}`)}</span>}
          </div>
        </div>
        {planKey !== 'agency' && (
          <button onClick={() => showUpgrade()} className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
            {t('আপগ্রেড করুন', 'Upgrade')} <ArrowRight size={14} />
          </button>
        )}
      </section>

      {/* Buy More Credits — only for subscribed users */}
      {isPaidSubscriber && packs.length > 0 && (
        <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Package size={16} className="text-primary" />
            <h3 className="text-base font-semibold text-foreground">{t('ক্রেডিট টপ আপ', 'Top up your credits')}</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{t('ক্রেডিট কখনো মেয়াদোত্তীর্ণ হয় না এবং আপনার সাবস্ক্রিপশনের উপরে যোগ হয়।', 'Credits never expire and stack on top of your subscription.')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {packs.map(pack => {
              const isPopular = pack.name === 'Medium';
              const price = currency === 'BDT' ? `৳${pack.price_bdt.toLocaleString()}` : `$${pack.price_usd}`;
              const imgCount = Math.floor(pack.credits / 125);
              const vidCount = Math.floor(pack.credits / 330);
              const PackIcon = PACK_ICONS[pack.name] || Zap;
              return (
                <div key={pack.id} className={`rounded-xl border-2 p-4 flex flex-col ${isPopular ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <PackIcon size={14} className="text-primary" />
                    <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{pack.name}</p>
                    {isPopular && <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{t('জনপ্রিয়', 'Popular')}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{pack.credits.toLocaleString()} {t('ক্রেডিট', 'credits')}</p>
                  <p className="text-[11px] text-muted-foreground mb-3">~{imgCount} {t('ছবি', 'images')} · ~{vidCount} {t('ভিডিও', 'videos')}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <p className="text-lg font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>{price}</p>
                    <button
                      onClick={() => initiatePackPurchase(pack.id)}
                      disabled={!!packCheckoutLoading}
                      className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {packCheckoutLoading === pack.id ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
                      {t('কিনুন', 'Buy')} <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Credit Pack Purchase History */}
      {paidPurchases.length > 0 && (
        <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            {t('ক্রেডিট প্যাক ইতিহাস', 'Credit Pack History')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">{t('তারিখ', 'Date')}</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">{t('প্যাক', 'Pack')}</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">{t('ক্রেডিট', 'Credits')}</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">{t('পরিমাণ', 'Amount')}</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">{t('স্ট্যাটাস', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {paidPurchases.map(p => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2.5 text-foreground">{format(new Date(p.created_at), 'MMM d, yyyy')}</td>
                    <td className="py-2.5 text-foreground">{p.credit_packs?.name || '—'}</td>
                    <td className="py-2.5 text-green-600 font-semibold">+{p.credits.toLocaleString()}</td>
                    <td className="py-2.5 text-foreground">{p.currency === 'BDT' ? '৳' : '$'}{Number(p.amount).toLocaleString()}</td>
                    <td className="py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/10 text-green-600 flex items-center gap-1 w-fit">
                        <CheckCircle2 size={10} /> Paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Plan Comparison with Checkout */}
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">{t('প্ল্যান তুলনা', 'Plan Comparison')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLAN_CARDS.map(plan => {
            const isCurrent = planKey === plan.key;
            const price = currency === 'BDT' ? plan.priceBDT : plan.priceUSD;
            return (
              <div key={plan.key} className={`rounded-xl p-4 border transition-colors ${isCurrent ? 'border-primary bg-primary/[0.03]' : 'border-border'}`}>
                <h4 className="text-sm font-bold text-foreground">{plan.name}</h4>
                <p className="text-lg font-bold text-foreground mt-1">{price}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1">{plan.credits} {t('ক্রেডিট/মাস', 'credits/mo')}</p>
                {isCurrent ? (
                  <span className="mt-3 block text-xs text-primary font-medium">{t('বর্তমান প্ল্যান', 'Current plan')}</span>
                ) : (
                  <button
                    onClick={() => initiateCheckout(plan.key)}
                    disabled={!!checkoutLoading}
                    className="mt-3 w-full bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {checkoutLoading === plan.key ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CreditCard size={12} />
                    )}
                    {t('সাবস্ক্রাইব', 'Subscribe')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Billing History */}
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">{t('বিলিং ইতিহাস', 'Billing History')}</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
        ) : billingHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">{t('এখনো কোনো বিলিং ইতিহাস নেই', 'No billing history yet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">{t('তারিখ', 'Date')}</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">{t('প্ল্যান', 'Plan')}</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">{t('পরিমাণ', 'Amount')}</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">{t('স্ট্যাটাস', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {billingHistory.map(bh => (
                  <tr key={bh.id} className="border-b border-border/50">
                    <td className="py-2.5 text-foreground">{format(new Date(bh.created_at), 'MMM d, yyyy')}</td>
                    <td className="py-2.5 text-foreground">{bh.plan_name}</td>
                    <td className="py-2.5 text-foreground">{bh.currency === 'BDT' ? '৳' : '$'}{(bh.amount / 100).toLocaleString()}</td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        bh.status === 'paid' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
                      }`}>{bh.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Subscription Management */}
      {profile?.subscription_status === 'active' && (
        <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">{t('সাবস্ক্রিপশন ম্যানেজমেন্ট', 'Subscription Management')}</h3>
          {subscription?.cancel_at_period_end ? (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('সাবস্ক্রিপশন বাতিল করা হয়েছে। অ্যাক্সেস চলবে ', 'Subscription cancelled. Access continues until ')}
                {subscription?.current_period_end ? format(new Date(subscription.current_period_end), 'MMM d, yyyy') : ''}
              </p>
              <button
                onClick={handleReactivate}
                disabled={reactivateLoading}
                className="bg-green-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {reactivateLoading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                {t('পুনরায় সক্রিয় করুন', 'Reactivate Subscription')}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowCancelModal(true)}
              className="border border-destructive text-destructive rounded-xl px-4 py-2 text-sm font-medium hover:bg-destructive/10 transition-colors">
              {t('সাবস্ক্রিপশন বাতিল করুন', 'Cancel Subscription')}
            </button>
          )}
        </section>
      )}

      {/* Payment Method */}
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-2">{t('পেমেন্ট মেথড', 'Payment Method')}</h3>
        <p className="text-sm text-muted-foreground mb-1">Payment via SSLCommerz</p>
        <p className="text-xs text-muted-foreground">Visa / Mastercard / bKash / Nagad and more</p>
      </section>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCancelModal(false)}>
          <div className="bg-card rounded-2xl w-full max-w-[440px] p-6 sm:p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-3">{t('সাবস্ক্রিপশন বাতিল করবেন?', 'Cancel subscription?')}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t('আপনার ক্রেডিট বর্তমান পিরিয়ড শেষ না হওয়া পর্যন্ত সক্রিয় থাকবে।', 'Your credits will remain active until the current period ends.')}
            </p>
            <div className="space-y-2 mb-5">
              {[
                { value: 'expensive', label: t('অনেক দাম', 'Too expensive') },
                { value: 'not_using', label: t('পর্যাপ্ত ব্যবহার হচ্ছে না', 'Not using it enough') },
                { value: 'missing_feature', label: t('প্রয়োজনীয় ফিচার নেই', 'Missing a feature I need') },
                { value: 'switching', label: t('অন্য টুলে যাচ্ছি', 'Switching to another tool') },
                { value: 'other', label: t('অন্যান্য', 'Other') },
              ].map(r => (
                <label key={r.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary cursor-pointer text-sm">
                  <input type="radio" name="cancel_reason" value={r.value} checked={cancelReason === r.value}
                    onChange={e => setCancelReason(e.target.value)} className="accent-primary" />
                  {r.label}
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <button onClick={() => setShowCancelModal(false)} className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold">
                {t('সাবস্ক্রিপশন রাখুন', 'Keep My Subscription')}
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="w-full text-destructive hover:underline text-sm py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {cancelLoading && <Loader2 size={12} className="animate-spin" />}
                {t('তবুও বাতিল করুন', 'Cancel Anyway')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingTab;
