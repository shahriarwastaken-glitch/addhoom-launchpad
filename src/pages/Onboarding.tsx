import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Globe, Search, ShoppingBag, Sparkles, Store, X,
} from 'lucide-react';
import { toast } from 'sonner';
import EntryPointCards, { type EntryPointType } from '@/components/onboarding/EntryPointCards';
import ManualEntryForm from '@/components/onboarding/ManualEntryForm';
import TemplateSelector from '@/components/onboarding/TemplateSelector';
import PhotoUploader from '@/components/onboarding/PhotoUploader';

const TOTAL_STEPS = 5;

const STEP_SLIDE = {
  initial: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};
const STEP_TRANSITION = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const };

const ANALYZING_STEPS = [
  { icon: Search, text: 'Analyzing source...' },
  { icon: Sparkles, text: 'Extracting brand identity...' },
  { icon: ShoppingBag, text: 'Building product catalog...' },
  { icon: Check, text: 'Ready!' },
];

const INDUSTRIES = [
  { emoji: '👗', label: 'Fashion' },
  { emoji: '👟', label: 'Footwear' },
  { emoji: '💄', label: 'Beauty' },
  { emoji: '📱', label: 'Electronics' },
  { emoji: '🍔', label: 'Food & Beverage' },
  { emoji: '🏠', label: 'Home & Furniture' },
  { emoji: '💍', label: 'Jewellery' },
  { emoji: '🎒', label: 'Bags' },
  { emoji: '🧸', label: 'Kids & Toys' },
  { emoji: '⚽', label: 'Sports' },
  { emoji: '💊', label: 'Health' },
  { emoji: '📦', label: 'Other' },
];

const PLATFORMS = [
  { emoji: '📘', label: 'Facebook' },
  { emoji: '📸', label: 'Instagram' },
  { emoji: '🛒', label: 'Daraz' },
  { emoji: '🌐', label: 'Own Website' },
  { emoji: '📦', label: 'Multiple' },
];

const LANGUAGES = [
  { emoji: '🇬🇧', label: 'English', value: 'en' },
  { emoji: '🇧🇩', label: 'বাংলা', value: 'bn' },
  { emoji: '🔀', label: 'Banglish', value: 'banglish' },
];

const CREDIT_COSTS = [
  { emoji: '📸', label: 'Image Generation', credits: 125 },
  { emoji: '🎬', label: 'Video Generation', credits: 330 },
  { emoji: '✍️', label: 'Ad Copy', credits: 10 },
  { emoji: '✨', label: 'Prompt Enhance', credits: 10 },
  { emoji: '⬆️', label: 'Upscale', credits: 100 },
  { emoji: '👗', label: 'Virtual Try-On', credits: 125 },
  { emoji: '📅', label: 'Content Calendar', credits: 500 },
  { emoji: '🔍', label: 'Account Doctor', credits: 50 },
  { emoji: '✅', label: 'Dhoom Score', credits: 0 },
];

const PLAN_CARDS = [
  {
    id: 'starter',
    name: 'Starter',
    priceUsd: 19,
    priceBdt: 799,
    credits: 5000,
    estimates: '~40 images · ~15 videos · ~500 ad copies',
    features: ['All core features', '1 workspace', 'Email support', 'Dhoom Score free'],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    priceUsd: 49,
    priceBdt: 1999,
    credits: 15000,
    estimates: '~120 images · ~45 videos · ~1,500 ad copies',
    features: ['Everything in Starter', 'Virtual Try-On', '5 workspaces', 'Content Calendar', 'Priority support'],
    popular: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    priceUsd: 99,
    priceBdt: 4999,
    credits: 35000,
    estimates: '~280 images · ~106 videos · ~3,500 ad copies',
    features: ['Everything in Pro', '20 workspaces', 'White label', 'Dedicated support'],
    popular: false,
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, profile, activeWorkspace, refreshProfile, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Screen 2
  const [entryPoint, setEntryPoint] = useState<EntryPointType | null>(null);
  const [shopUrl, setShopUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);

  // Screen 3
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  // Screen 5
  const [currency, setCurrency] = useState<'intl' | 'bdt'>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Dhaka' ? 'bdt' : 'intl';
    } catch { return 'intl'; }
  });
  const [planLoading, setPlanLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth', { replace: true });
  }, [loading, user]);

  useEffect(() => {
    if (!loading && profile?.onboarding_complete) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, profile]);

  // Resume from saved step
  useEffect(() => {
    if (profile) {
      const saved = (profile as any).onboarding_step;
      if (saved && saved > 1 && saved <= TOTAL_STEPS) setStep(saved);
    }
  }, [profile]);

  // Pre-fill from existing data
  useEffect(() => {
    if (activeWorkspace?.industry) setSelectedIndustry(activeWorkspace.industry);
    if ((activeWorkspace as any)?.primary_platform) setSelectedPlatform((activeWorkspace as any).primary_platform);
    if (profile?.language_pref) setSelectedLanguage(profile.language_pref);
  }, [activeWorkspace, profile]);

  const goTo = async (s: number) => {
    setDirection(s > step ? 1 : -1);
    setStep(s);
    if (user) {
      await supabase.from('profiles').update({ onboarding_step: s } as any).eq('id', user.id);
    }
  };

  // --- Screen 2: Shop DNA handlers ---
  const handleUrlAnalyze = async (platform: string) => {
    if (!shopUrl.trim() || !activeWorkspace) return;
    setAnalyzing(true);
    setAnalyzeStep(0);
    const interval = setInterval(() => {
      setAnalyzeStep(prev => prev >= ANALYZING_STEPS.length - 1 ? prev : prev + 1);
    }, 2000);
    try {
      const { data, error } = await supabase.functions.invoke('setup-shop-dna', {
        body: { workspace_id: activeWorkspace.id, url: shopUrl.trim(), platform },
      });
      clearInterval(interval);
      setAnalyzeStep(ANALYZING_STEPS.length - 1);
      if (error || !data?.success) {
        toast.error('Could not extract info. Please try another method.');
        setAnalyzing(false);
        return;
      }
      await refreshProfile();
      setTimeout(() => { setAnalyzing(false); goTo(3); }, 800);
    } catch {
      clearInterval(interval);
      toast.error('Something went wrong.');
      setAnalyzing(false);
    }
  };

  const handleManualSubmit = async (formData: any) => {
    if (!activeWorkspace) return;
    setAnalyzing(true);
    try {
      await supabase.functions.invoke('setup-shop-dna', {
        body: { workspace_id: activeWorkspace.id, platform: 'manual', payload: { form_data: formData } },
      });
      await refreshProfile();
      setAnalyzing(false);
      goTo(3);
    } catch {
      toast.error('Something went wrong.');
      setAnalyzing(false);
    }
  };

  const handleTemplateSelect = async (industry: string, templateData: any) => {
    if (!activeWorkspace) return;
    setAnalyzing(true);
    try {
      await supabase.functions.invoke('setup-shop-dna', {
        body: { workspace_id: activeWorkspace.id, platform: 'template', payload: { industry, template_data: templateData } },
      });
      await refreshProfile();
      setAnalyzing(false);
      goTo(3);
    } catch {
      toast.error('Something went wrong.');
      setAnalyzing(false);
    }
  };

  const handlePhotosSubmit = async (base64Images: string[]) => {
    if (!activeWorkspace) return;
    setAnalyzing(true);
    setAnalyzeStep(0);
    const interval = setInterval(() => {
      setAnalyzeStep(prev => prev >= ANALYZING_STEPS.length - 1 ? prev : prev + 1);
    }, 2500);
    try {
      const { data, error } = await supabase.functions.invoke('setup-shop-dna', {
        body: { workspace_id: activeWorkspace.id, platform: 'photos', payload: { images: base64Images } },
      });
      clearInterval(interval);
      setAnalyzeStep(ANALYZING_STEPS.length - 1);
      if (error || !data?.success) {
        toast.error('Could not analyze photos.');
        setAnalyzing(false);
        return;
      }
      await refreshProfile();
      setTimeout(() => { setAnalyzing(false); goTo(3); }, 800);
    } catch {
      clearInterval(interval);
      toast.error('Something went wrong.');
      setAnalyzing(false);
    }
  };

  // --- Screen 3: Save preferences ---
  const handleSavePreferences = async () => {
    if (!activeWorkspace || !user) { goTo(4); return; }
    try {
      await supabase.from('workspaces').update({
        industry: selectedIndustry,
        primary_platform: selectedPlatform,
        default_language: selectedLanguage,
      } as any).eq('id', activeWorkspace.id);
      await supabase.from('profiles').update({ language_pref: selectedLanguage } as any).eq('id', user.id);
      await refreshProfile();
    } catch { /* continue */ }
    goTo(4);
  };

  // --- Screen 5: Plan selection ---
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
        const planCredits = PLAN_CARDS.find(p => p.id === planId)?.credits || 5000;
        toast.success(`🎉 Welcome! Your ${planCredits.toLocaleString()} credits are ready.`);
        await supabase.from('profiles').update({ onboarding_complete: true, onboarding_step: 5 } as any).eq('id', user!.id);
        await refreshProfile();
        navigate('/dashboard', { replace: true });
      }
    } catch (e: any) {
      toast.error(e.message || 'Payment failed. Please try again.');
    } finally {
      setPlanLoading(null);
    }
  };

  const handleSubscribeLater = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ onboarding_complete: true, onboarding_step: 5 } as any).eq('id', user.id);
    await refreshProfile();
    navigate('/dashboard', { replace: true });
  };

  const handleSkip = () => goTo(step + 1);

  const renderUrlInput = () => {
    const placeholders: Record<string, string> = {
      website: 'https://yourshop.com',
      facebook: 'facebook.com/yourpagename',
      daraz: 'daraz.com.bd/shop/yourshop',
    };
    return (
      <div className="mt-5 space-y-4">
        <div className="relative">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="url"
            value={shopUrl}
            onChange={e => setShopUrl(e.target.value)}
            placeholder={placeholders[entryPoint!]}
            className="w-full bg-secondary border-2 border-border rounded-2xl pl-11 pr-5 py-4 text-base focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={() => handleUrlAnalyze(entryPoint!)}
          disabled={!shopUrl.trim()}
          className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-base font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Continue →
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary text-xl font-bold">AdDhoom</div>
      </div>
    );
  }

  const cardMaxWidth = step === 5 ? 'max-w-[900px]' : 'max-w-[520px]';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(28,27,26,0.6)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        layout
        className={`bg-card rounded-3xl shadow-warm-lg w-full ${cardMaxWidth} max-h-[90vh] overflow-y-auto p-8 sm:p-10 relative`}
        transition={{ duration: 0.3 }}
      >
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-end mb-2">
            <span className="text-xs text-muted-foreground">Step {step} of {TOTAL_STEPS}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#E8E3DC' }}>
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          {/* SCREEN 1 — Welcome */}
          {step === 1 && (
            <motion.div key="s1" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION} className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                  <span className="font-bn text-2xl font-bold text-primary-foreground leading-none">আ</span>
                </div>
              </div>
              <h1 className="text-[28px] sm:text-[32px] font-bold text-foreground leading-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
                Welcome to AdDhoom Studio
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                Let's set up your workspace<br />in under a minute.
              </p>
              <button
                onClick={() => goTo(2)}
                className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-base font-bold hover:opacity-90 transition-all"
              >
                Let's Go →
              </button>
            </motion.div>
          )}

          {/* SCREEN 2 — Shop DNA */}
          {step === 2 && !analyzing && (
            <motion.div key="s2" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION} className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
                  Tell us about your shop
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Helps AdDhoom write better ads for your specific products.
                </p>
              </div>

              <EntryPointCards selected={entryPoint} onSelect={setEntryPoint} />

              <AnimatePresence mode="wait">
                {entryPoint && ['website', 'facebook', 'daraz'].includes(entryPoint) && (
                  <motion.div key="url" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    {renderUrlInput()}
                  </motion.div>
                )}
                {entryPoint === 'photos' && (
                  <motion.div key="photos" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <PhotoUploader onSubmit={handlePhotosSubmit} />
                  </motion.div>
                )}
                {entryPoint === 'manual' && (
                  <motion.div key="manual" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <ManualEntryForm onSubmit={handleManualSubmit} />
                  </motion.div>
                )}
                {entryPoint === 'template' && (
                  <motion.div key="template" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <TemplateSelector onSelect={handleTemplateSelect} />
                  </motion.div>
                )}
              </AnimatePresence>

              <button onClick={handleSkip} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-2">
                Skip for now →
              </button>
            </motion.div>
          )}

          {/* Analyzing state */}
          {step === 2 && analyzing && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-6 py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
                <Store className="text-primary" size={32} />
              </div>
              <div className="space-y-3 max-w-xs mx-auto">
                {ANALYZING_STEPS.map((s, i) => (
                  <div key={i} className={`flex items-center gap-3 text-sm ${i <= analyzeStep ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                    {i < analyzeStep ? (
                      <Check size={14} className="text-[hsl(var(--brand-green))]" />
                    ) : (
                      <s.icon size={14} className={i === analyzeStep ? 'text-primary animate-pulse' : ''} />
                    )}
                    <span>{s.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCREEN 3 — Quick Preferences */}
          {step === 3 && (
            <motion.div key="s3" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION} className="space-y-6">
              <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
                A few quick questions
              </h1>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wider">What do you sell?</p>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind.label}
                      onClick={() => setSelectedIndustry(ind.label)}
                      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
                        selectedIndustry === ind.label
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {ind.emoji} {ind.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wider">Where do you sell?</p>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => setSelectedPlatform(p.label)}
                      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
                        selectedPlatform === p.label
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {p.emoji} {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wider">Ad language?</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.value}
                      onClick={() => setSelectedLanguage(l.value)}
                      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
                        selectedLanguage === l.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {l.emoji} {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSavePreferences}
                className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-base font-bold hover:opacity-90 transition-all"
              >
                Next →
              </button>
              <button onClick={handleSkip} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                Skip →
              </button>
            </motion.div>
          )}

          {/* SCREEN 4 — Credits Explainer */}
          {step === 4 && (
            <motion.div key="s4" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
                  How credits work
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Every action uses credits. Subscribe to get your monthly allowance.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CREDIT_COSTS.map(item => (
                  <div key={item.label} className="flex items-center justify-between bg-secondary rounded-xl px-3.5 py-3">
                    <span className="text-sm text-foreground flex items-center gap-2">
                      <span>{item.emoji}</span> {item.label}
                    </span>
                    {item.credits === 0 ? (
                      <span className="text-sm font-bold" style={{ color: '#00B96B' }}>Free</span>
                    ) : (
                      <span className="text-sm font-bold text-foreground">{item.credits}</span>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Credits reset every 30 days from your subscription date.
              </p>

              <button
                onClick={() => goTo(5)}
                className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-base font-bold hover:opacity-90 transition-all"
              >
                Next →
              </button>
              <button onClick={handleSkip} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                Skip →
              </button>
            </motion.div>
          )}

          {/* SCREEN 5 — Choose a Plan */}
          {step === 5 && (
            <motion.div key="s5" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION} className="space-y-6">
              <div className="text-center">
                <h1 className="text-[24px] sm:text-[28px] font-bold text-foreground" style={{ fontFamily: 'Syne, sans-serif' }}>
                  Choose your plan
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Get your monthly credits and<br />start creating immediately.
                </p>
              </div>

              {/* Currency toggle */}
              <div className="flex justify-center">
                <div className="bg-secondary rounded-full p-1 flex">
                  <button
                    onClick={() => setCurrency('intl')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      currency === 'intl' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    🌍 International
                  </button>
                  <button
                    onClick={() => setCurrency('bdt')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      currency === 'bdt' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    🇧🇩 Bangladesh
                  </button>
                </div>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PLAN_CARDS.map(plan => (
                  <div
                    key={plan.id}
                    className={`relative bg-card rounded-2xl border-2 p-5 flex flex-col transition-all ${
                      plan.popular
                        ? 'border-primary shadow-lg sm:scale-[1.03]'
                        : 'border-border'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                        Most Popular
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-2xl font-bold text-foreground">
                        {currency === 'intl' ? `$${plan.priceUsd}` : `৳${plan.priceBdt.toLocaleString()}`}
                      </span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-primary font-semibold mt-1">
                      {plan.credits.toLocaleString()} credits/month
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{plan.estimates}</p>

                    <div className="mt-4 space-y-2 flex-1">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                          <Check size={14} className="text-[hsl(var(--brand-green))] flex-shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={planLoading === plan.id}
                      className={`w-full mt-4 rounded-xl py-3 font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                        plan.popular
                          ? 'bg-primary text-primary-foreground hover:opacity-90'
                          : 'bg-secondary text-foreground border border-border hover:bg-secondary/80'
                      }`}
                    >
                      {planLoading === plan.id ? (
                        <Sparkles size={14} className="animate-spin" />
                      ) : (
                        `Start with ${plan.name} →`
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <div className="text-center space-y-2 pt-2">
                <p className="text-xs text-muted-foreground">
                  7-day money back guarantee. Cancel anytime.
                </p>
                <button
                  onClick={handleSubscribeLater}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  I'll subscribe later →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Onboarding;
