import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, ChevronDown, ChevronRight, Copy, Crown, Globe, Lock,
  Pencil, Rocket, Search, ShoppingBag, Sparkles, Store, Target,
  MessageSquare, Package, Star, DollarSign, Factory, Zap
} from 'lucide-react';
import { toast } from 'sonner';

type ShopDNA = {
  shop_name: string;
  industry: string;
  brand_tone: string;
  target_audience: string;
  key_products: string;
  unique_selling: string;
  price_range: string;
};

const STEP_SLIDE = {
  initial: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const STEP_TRANSITION = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const };

const plans = [
  {
    id: 'pro',
    name: 'Pro',
    price: '৳2,999',
    period: '/mo',
    features: ['50 AI ads/day', 'All platforms', 'Competitor analysis', 'AI chat assistant', 'Account Doctor'],
    gradient: 'from-primary to-accent',
    icon: Zap,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '৳7,999',
    period: '/mo',
    features: ['All Pro features', 'Unlimited AI ads', 'Video ad generator', 'Content calendar', 'Festival templates', 'Priority support'],
    gradient: 'from-[hsl(var(--brand-purple))] to-primary',
    icon: Crown,
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, profile, activeWorkspace, refreshProfile, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1
  const [shopUrl, setShopUrl] = useState('');
  const [platform, setPlatform] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Step 2
  const [dna, setDna] = useState<ShopDNA | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Step 3 — plan selection
  const [planLoading, setPlanLoading] = useState<string | null>(null);

  // Manual fields
  const [manualDna, setManualDna] = useState<ShopDNA>({
    shop_name: '', industry: '', brand_tone: '', target_audience: '',
    key_products: '', unique_selling: '', price_range: '',
  });

  useEffect(() => {
    if (!loading && !user) navigate('/auth', { replace: true });
  }, [loading, user]);

  useEffect(() => {
    if (!loading && profile?.onboarding_complete && activeWorkspace?.shop_url) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, profile, activeWorkspace]);

  const goTo = (s: number) => {
    setDirection(s > step ? 1 : -1);
    setStep(s);
  };

  const placeholders: Record<string, string> = {
    facebook: 'facebook.com/yourshopname',
    daraz: 'daraz.com.bd/shop/yourshop',
    default: 'Your Daraz / Facebook / website link',
  };

  // Step 1 → analyze
  const handleAnalyze = async () => {
    if (!shopUrl.trim() && !showManual) return;
    if (!activeWorkspace) return;

    if (showManual) {
      setDna(manualDna);
      goTo(2);
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-shop-dna', {
        body: { workspace_id: activeWorkspace.id, shop_url: shopUrl.trim() },
      });
      if (error || !data?.success) {
        toast.error('Could not extract info from URL. Please enter details manually.');
        setShowManual(true);
        setAnalyzing(false);
        return;
      }
      setDna(data.dna);
      goTo(2);
    } catch {
      toast.error('Something went wrong. Please enter details manually.');
      setShowManual(true);
    } finally {
      setAnalyzing(false);
    }
  };

  // Step 2 → save DNA
  const handleSaveDna = async () => {
    if (!dna || !activeWorkspace) return;
    try {
      await supabase.from('workspaces').update({
        shop_name: dna.shop_name || 'My Shop',
        industry: dna.industry,
        brand_tone: dna.brand_tone,
        target_audience: dna.target_audience,
        key_products: dna.key_products,
        unique_selling: dna.unique_selling,
        price_range: dna.price_range,
        shop_url: shopUrl || null,
      } as any).eq('id', activeWorkspace.id);

      // Mark onboarding complete
      await supabase.from('profiles').update({ onboarding_complete: true } as any).eq('id', user!.id);
      await refreshProfile();
      goTo(3);
    } catch {
      toast.error('Failed to save. Please try again.');
    }
  };

  // Step 3 → select plan
  const handleSelectPlan = async (planId: string) => {
    setPlanLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { plan: planId, billing_cycle: 'monthly' },
      });
      if (error) throw error;
      if (data?.gateway_url) {
        window.location.href = data.gateway_url;
      } else if (data?.dev_mode) {
        toast.success('Plan activated!');
        await refreshProfile();
        navigate('/dashboard', { replace: true });
      }
    } catch (e: any) {
      toast.error(e.message || 'Payment failed');
    } finally {
      setPlanLoading(null);
    }
  };

  // Skip flow
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const handleSkip = async () => {
    try {
      await supabase.from('profiles').update({ onboarding_complete: false } as any).eq('id', user!.id);
      navigate('/dashboard', { replace: true });
    } catch {
      navigate('/dashboard', { replace: true });
    }
  };

  const updateDna = (field: keyof ShopDNA, value: string) => {
    if (dna) setDna({ ...dna, [field]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary text-xl font-bold">AdDhoom</div>
      </div>
    );
  }

  const dnaFields: { key: keyof ShopDNA; icon: React.ReactNode; label: string }[] = [
    { key: 'shop_name', icon: <Store size={14} className="text-primary" />, label: 'Shop Name' },
    { key: 'industry', icon: <Factory size={14} className="text-primary" />, label: 'Industry' },
    { key: 'target_audience', icon: <Target size={14} className="text-primary" />, label: 'Target Audience' },
    { key: 'brand_tone', icon: <MessageSquare size={14} className="text-primary" />, label: 'Brand Voice' },
    { key: 'key_products', icon: <Package size={14} className="text-primary" />, label: 'Key Products' },
    { key: 'unique_selling', icon: <Star size={14} className="text-primary" />, label: 'Unique Selling Point' },
    { key: 'price_range', icon: <DollarSign size={14} className="text-primary" />, label: 'Price Range' },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="grain-overlay" />

      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[700px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="font-bn text-[15px] font-bold text-primary-foreground leading-none">আ</span>
            </div>
            <span className="font-en text-lg font-[800] text-foreground tracking-[-0.02em]">AdDhoom</span>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-0">
            {[1, 2, 3].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  s < step ? 'w-5 h-5 bg-[hsl(var(--brand-green))] text-white' :
                  s === step ? 'w-6 h-6 bg-primary text-primary-foreground' :
                  'w-4 h-4 border-2 border-muted-foreground/30'
                }`}>
                  {s < step ? <Check size={12} /> : s === step ? s : null}
                </div>
                {i < 2 && (
                  <div className={`w-10 h-0.5 mx-0.5 ${s < step ? 'bg-[hsl(var(--brand-green))]' : 'border-t-2 border-dashed border-muted-foreground/20'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Skip */}
          {step < 3 && (
            <button
              onClick={() => setShowSkipConfirm(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>
          )}
          {step >= 3 && <div className="w-8" />}
        </div>
      </div>

      {/* Skip Confirmation */}
      <AnimatePresence>
        {showSkipConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 left-0 right-0 z-40 bg-card border-b border-border px-6 py-3"
          >
            <div className="max-w-[600px] mx-auto text-center">
              <p className="text-sm text-foreground mb-2">
                You can always complete setup later. Go to dashboard now?
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={handleSkip} className="text-sm font-semibold text-primary hover:underline">
                  Yes, go to dashboard
                </button>
                <button onClick={() => setShowSkipConfirm(false)} className="text-sm text-muted-foreground hover:text-foreground">
                  No, continue setup
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="pt-20 pb-12 px-6 max-w-[600px] mx-auto min-h-screen flex flex-col justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          {/* STEP 1 — Shop Link */}
          {step === 1 && (
            <motion.div key="step1" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Step 1 of 3</p>
              <h1 className="text-3xl font-bold text-foreground mb-2">Where's your shop?</h1>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Paste your link — AI will figure out everything.<br />Shop name, products, brand voice.
              </p>

              <div className="space-y-4">
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="url"
                    value={shopUrl}
                    onChange={(e) => setShopUrl(e.target.value)}
                    placeholder={placeholders[platform || 'default']}
                    className="w-full bg-card border-2 border-border rounded-2xl pl-11 pr-5 py-4 text-base font-body focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                  />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Or choose a platform:</p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: 'facebook', label: 'Facebook Page', icon: <Globe size={14} /> },
                      { id: 'daraz', label: 'Daraz Store', icon: <ShoppingBag size={14} /> },
                      { id: 'website', label: 'Website', icon: <Search size={14} /> },
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPlatform(p.id)}
                        className={`text-sm rounded-full px-4 py-2.5 border transition-all flex items-center gap-1.5 ${
                          platform === p.id
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {p.icon} {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setShowManual(!showManual)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown size={14} className={`transition-transform ${showManual ? 'rotate-180' : ''}`} />
                  No link? Enter details manually
                </button>

                <AnimatePresence>
                  {showManual && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      {[
                        { key: 'shop_name', label: 'Shop Name', placeholder: 'e.g. Fashion Dhaka' },
                        { key: 'industry', label: 'Industry', placeholder: 'e.g. Fashion & Clothing' },
                        { key: 'key_products', label: 'Key Products', placeholder: 'e.g. Sarees, Kurtis' },
                        { key: 'target_audience', label: 'Target Audience', placeholder: 'e.g. Women 18-35, Dhaka' },
                        { key: 'brand_tone', label: 'Brand Voice', placeholder: 'e.g. Friendly, Modern' },
                        { key: 'unique_selling', label: 'Unique Selling Point', placeholder: 'What makes you different?' },
                        { key: 'price_range', label: 'Price Range', placeholder: 'e.g. ৳500 - ৳3,000' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="text-xs font-semibold text-foreground mb-1 block">{f.label}</label>
                          <input
                            type="text"
                            value={manualDna[f.key as keyof ShopDNA]}
                            onChange={(e) => setManualDna({ ...manualDna, [f.key]: e.target.value })}
                            placeholder={f.placeholder}
                            className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                          />
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Lock size={12} /> We only view public info. No login or password needed.
                </p>

                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || (!shopUrl.trim() && !showManual)}
                  className="w-full bg-gradient-cta text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-orange-glow hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <><Sparkles size={18} className="animate-spin" /> Analyzing your shop...</>
                  ) : (
                    <>Next <ChevronRight size={18} /></>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2 — AI Review */}
          {step === 2 && dna && (
            <motion.div key="step2" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Step 2 of 3</p>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                AI understood your shop! <Sparkles size={24} className="text-primary" />
              </h1>
              <p className="text-muted-foreground mb-8">Review the details below — look right?</p>

              <div className="space-y-3">
                {dnaFields.map((field, i) => (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12, duration: 0.3 }}
                    className="bg-card rounded-[14px] p-4 border-l-4 border-l-primary"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                        {field.icon} {field.label}
                      </span>
                      <button
                        onClick={() => setEditingField(editingField === field.key ? null : field.key)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                    {editingField === field.key ? (
                      <input
                        autoFocus
                        value={dna[field.key] || ''}
                        onChange={(e) => updateDna(field.key, e.target.value)}
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                        placeholder="AI couldn't detect — type here"
                        className="w-full bg-transparent border-b border-primary text-base font-semibold focus:outline-none text-foreground"
                      />
                    ) : (
                      <p className={`text-base font-semibold ${dna[field.key] ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                        {dna[field.key] || 'Not detected — click pencil to add'}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6 mb-3">
                Everything look good? Let's choose your plan!
              </p>

              <button
                onClick={handleSaveDna}
                className="w-full bg-gradient-cta text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-orange-glow hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
              >
                Next <ChevronRight size={18} />
              </button>

              <button onClick={handleSaveDna} className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-3">
                I'll fix these later →
              </button>
            </motion.div>
          )}

          {/* STEP 3 — Choose Plan */}
          {step === 3 && (
            <motion.div key="step3" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Step 3 of 3</p>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                Choose your plan <Crown size={24} className="text-primary" />
              </h1>
              <p className="text-muted-foreground mb-8">
                Your shop DNA is saved. Pick a plan to start creating AI-powered ads.
              </p>

              <div className="space-y-4">
                {plans.map(plan => (
                  <div key={plan.id} className="bg-card rounded-2xl border border-border overflow-hidden shadow-warm">
                    <div className={`bg-gradient-to-r ${plan.gradient} p-5 text-white`}>
                      <div className="flex items-center gap-2">
                        <plan.icon size={20} />
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <span className="text-2xl font-mono font-bold">{plan.price}</span>
                        <span className="text-sm opacity-80">{plan.period}</span>
                      </div>
                    </div>
                    <div className="p-5 space-y-2.5">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check size={14} className="text-[hsl(var(--brand-green))] flex-shrink-0" />
                          <span className="text-foreground">{f}</span>
                        </div>
                      ))}
                      <button
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={planLoading === plan.id}
                        className="w-full mt-3 bg-gradient-cta text-primary-foreground rounded-xl py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {planLoading === plan.id ? (
                          <Sparkles size={16} className="animate-spin" />
                        ) : (
                          <><Zap size={16} /> Get {plan.name}</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI confidence reminder */}
              {dna && (
                <div className="mt-6 rounded-xl border border-[hsl(var(--brand-green))]/15 bg-[hsl(var(--brand-green))]/5 p-4">
                  <p className="text-sm text-foreground flex items-center gap-1.5">
                    <Check size={14} className="text-[hsl(var(--brand-green))]" />
                    Shop DNA saved: {dna.shop_name} · {dna.industry}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    AI will use your shop data to create personalized ads as soon as you subscribe.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
