import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Crown, Zap, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

const plans = [
  {
    id: 'pro',
    bn: 'প্রো',
    en: 'Pro',
    priceBn: '৳২,৯৯৯',
    priceEn: '৳2,999',
    period: '/mo',
    features: [
      { bn: '৫০টি AI বিজ্ঞাপন/দিন', en: '50 AI ads/day' },
      { bn: 'সব প্ল্যাটফর্ম সাপোর্ট', en: 'All platforms' },
      { bn: 'প্রতিযোগী বিশ্লেষণ', en: 'Competitor analysis' },
      { bn: 'AI চ্যাট অ্যাসিস্ট্যান্ট', en: 'AI chat assistant' },
      { bn: 'অ্যাকাউন্ট ডাক্তার', en: 'Account Doctor' },
    ],
    gradient: 'from-primary to-accent',
  },
  {
    id: 'agency',
    bn: 'এজেন্সি',
    en: 'Agency',
    priceBn: '৳৭,৯৯৯',
    priceEn: '৳7,999',
    period: '/mo',
    features: [
      { bn: 'সব প্রো ফিচার', en: 'All Pro features' },
      { bn: 'আনলিমিটেড AI বিজ্ঞাপন', en: 'Unlimited AI ads' },
      { bn: 'ভিডিও অ্যাড জেনারেটর', en: 'Video ad generator' },
      { bn: 'কনটেন্ট ক্যালেন্ডার', en: 'Content calendar' },
      { bn: 'উৎসব টেমপ্লেট', en: 'Festival templates' },
      { bn: 'প্রায়োরিটি সাপোর্ট', en: 'Priority support' },
    ],
    gradient: 'from-brand-purple to-primary',
  },
];

const PlanGate = () => {
  const { t } = useLanguage();
  const { signOut, activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    setLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { plan: planId, billing_cycle: 'monthly' },
      });

      if (error) throw error;

      if (data?.gateway_url) {
        window.location.href = data.gateway_url;
      } else if (data?.dev_mode) {
        // Dev mode — simulate payment success
        toast.success(t('ডেভ মোড: পেমেন্ট সিমুলেট হয়েছে', 'Dev mode: Payment simulated'));
        // Manually update profile for dev
        const { error: updateErr } = await supabase.from('profiles').update({
          plan: planId,
          subscription_status: 'active',
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', (await supabase.auth.getUser()).data.user?.id || '');
        
        if (!updateErr) {
          window.location.reload();
        }
      }
    } catch (e: any) {
      toast.error(e.message || t('পেমেন্ট ব্যর্থ', 'Payment failed'));
    } finally {
      setLoading(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
          <Crown size={16} /> {t('প্রিমিয়াম ফিচার', 'Premium Feature')}
        </div>
        <h1 className="text-3xl font-bold font-heading-bn text-foreground mb-3">
          {t('ড্যাশবোর্ড অ্যাক্সেস করতে প্ল্যান নির্বাচন করুন', 'Choose a plan to access the dashboard')}
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t('AI বিজ্ঞাপন, প্রতিযোগী বিশ্লেষণ, চ্যাট অ্যাসিস্ট্যান্ট — সবকিছু আনলক করুন।', 'Unlock AI ads, competitor analysis, chat assistant — everything.')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl w-full">
        {plans.map(plan => (
          <div key={plan.id} className="bg-card rounded-2xl shadow-warm-lg border border-border overflow-hidden">
            <div className={`bg-gradient-to-r ${plan.gradient} p-6 text-white`}>
              <h3 className="text-xl font-bold">{t(plan.bn, plan.en)}</h3>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-mono font-bold">{t(plan.priceBn, plan.priceEn)}</span>
                <span className="text-sm opacity-80">{plan.period}</span>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-brand-green flex-shrink-0" />
                  <span className="text-foreground font-body-bn">{t(f.bn, f.en)}</span>
                </div>
              ))}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading === plan.id}
                className="w-full mt-4 bg-gradient-cta text-primary-foreground rounded-full py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-50 font-body-bn flex items-center justify-center gap-2"
              >
                {loading === plan.id ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <><Zap size={16} /> {t('এই প্ল্যান নিন', 'Get this plan')}</>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button onClick={() => navigate('/')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {t('← হোমপেজে ফিরুন', '← Back to home')}
        </button>
        <button onClick={handleSignOut} className="text-sm text-destructive hover:underline">
          {t('লগআউট', 'Log out')}
        </button>
      </div>
    </div>
  );
};

export default PlanGate;
