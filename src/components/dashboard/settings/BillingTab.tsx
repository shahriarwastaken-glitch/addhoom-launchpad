import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUpgrade } from '@/contexts/UpgradeContext';
import { supabase } from '@/integrations/supabase/client';
import { Zap, ArrowRight, Download, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';

const BillingTab = () => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { showUpgrade } = useUpgrade();

  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const planKey = profile?.plan_key || 'free';
  const planCredits = useMemo(() => {
    if (planKey === 'agency') return 35000;
    if (planKey === 'pro') return 15000;
    return 5000;
  }, [planKey]);
  const creditBalance = profile?.credit_balance ?? 0;
  const creditPct = planCredits > 0 ? Math.round(((planCredits - creditBalance) / planCredits) * 100) : 0;
  const daysUntilReset = useMemo(() => {
    if (!profile?.credits_reset_at) return null;
    const resetDate = new Date(profile.credits_reset_at);
    resetDate.setDate(resetDate.getDate() + 30);
    return Math.max(0, Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }, [profile?.credits_reset_at]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [{ data: sub }, { data: history }] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
        supabase.from('billing_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      ]);
      setSubscription(sub);
      setBillingHistory(history || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const PLAN_CARDS = [
    { key: 'starter', name: 'Starter', price: '৳799', credits: '5,000' },
    { key: 'pro', name: 'Pro', price: '৳1,999', credits: '15,000' },
    { key: 'agency', name: 'Agency', price: '৳4,999', credits: '35,000' },
  ];

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">{t('বর্তমান প্ল্যান', 'Current Plan')}</h3>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            {profile?.plan || 'Free'}
          </span>
          {profile?.subscription_status === 'active' && (
            <span className="text-xs text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">{t('সক্রিয়', 'Active')}</span>
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
            {daysUntilReset !== null && <span>{t(`${daysUntilReset} দিনে রিসেট`, `Resets in ${daysUntilReset} days`)}</span>}
          </div>
        </div>

        {planKey !== 'agency' && (
          <button onClick={() => showUpgrade()} className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
            {t('আপগ্রেড করুন', 'Upgrade')} <ArrowRight size={14} />
          </button>
        )}
        {planKey === 'agency' && (
          <p className="text-sm text-muted-foreground">{t('আপনি আমাদের সেরা প্ল্যানে আছেন', "You're on our best plan")}</p>
        )}
      </section>

      {/* Plan Comparison */}
      <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">{t('প্ল্যান তুলনা', 'Plan Comparison')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLAN_CARDS.map(plan => {
            const isCurrent = planKey === plan.key;
            return (
              <div key={plan.key} className={`rounded-xl p-4 border transition-colors ${isCurrent ? 'border-primary bg-primary/[0.03]' : 'border-border'}`}>
                <h4 className="text-sm font-bold text-foreground">{plan.name}</h4>
                <p className="text-lg font-bold text-foreground mt-1">{plan.price}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1">{plan.credits} {t('ক্রেডিট/মাস', 'credits/mo')}</p>
                {isCurrent ? (
                  <span className="mt-3 block text-xs text-primary font-medium">{t('বর্তমান প্ল্যান', 'Current plan')}</span>
                ) : (
                  <button onClick={() => showUpgrade()} className="mt-3 w-full bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors">
                    {t('আপগ্রেড', 'Upgrade')}
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
              <button className="bg-green-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-green-700 transition-colors">
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
              <button onClick={() => setShowCancelModal(false)} className="w-full text-destructive hover:underline text-sm py-2">
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
