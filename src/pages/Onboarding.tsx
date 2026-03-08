import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ChevronRight, Copy, Globe, Lock, Pencil, Rocket, ShoppingBag, Sparkles } from 'lucide-react';
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

type AdResult = {
  headline: string;
  body: string;
  cta: string;
  dhoom_score: number;
  copy_score: number;
  framework: string;
  platform: string;
};

const STEP_SLIDE = {
  initial: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const STEP_TRANSITION = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const };

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, profile, activeWorkspace, refreshProfile, loading } = useAuth();
  const { t } = useLanguage();
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

  // Step 3
  const [productName, setProductName] = useState('');
  const [adPlatform, setAdPlatform] = useState('facebook');
  const [adFramework, setAdFramework] = useState('FOMO');
  const [generating, setGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Step 4
  const [ads, setAds] = useState<AdResult[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [copied, setCopied] = useState(false);
  const [completing, setCompleting] = useState(false);
  const scoreRef = useRef<HTMLSpanElement>(null);

  // Manual fields
  const [manualDna, setManualDna] = useState<ShopDNA>({
    shop_name: '', industry: '', brand_tone: '', target_audience: '',
    key_products: '', unique_selling: '', price_range: '',
  });

  useEffect(() => {
    if (!loading && !user) navigate('/auth', { replace: true });
  }, [loading, user]);

  // Already onboarded? Go to dashboard
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
    default: 'আপনার Daraz/Facebook/ওয়েবসাইট লিংক',
  };

  // Step 1 → analyze
  const handleAnalyze = async () => {
    if (!shopUrl.trim() && !showManual) return;
    if (!activeWorkspace) return;

    if (showManual) {
      // Use manual data
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
        toast.error('লিংক থেকে তথ্য পাওয়া যায়নি। নিজে তথ্য দিন।');
        setShowManual(true);
        setAnalyzing(false);
        return;
      }
      setDna(data.dna);
      goTo(2);
    } catch {
      toast.error('সমস্যা হয়েছে। নিজে তথ্য দিন।');
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
      await refreshProfile();
      goTo(3);
    } catch {
      toast.error('সংরক্ষণ করতে সমস্যা হয়েছে');
    }
  };

  // Step 3 → generate
  const loadingMessages = [
    'আপনার শপ বিশ্লেষণ হচ্ছে...',
    'বাংলাদেশের সেরা বিজ্ঞাপন কৌশল প্রয়োগ হচ্ছে...',
    'ধুম স্কোর হিসাব করা হচ্ছে...',
  ];

  useEffect(() => {
    if (!generating) return;
    const iv = setInterval(() => setLoadingMsgIdx(i => (i + 1) % loadingMessages.length), 2500);
    return () => clearInterval(iv);
  }, [generating]);

  const handleGenerate = async () => {
    if (!productName.trim() || !activeWorkspace) return;
    setGenerating(true);
    setLoadingMsgIdx(0);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ads', {
        body: {
          workspace_id: activeWorkspace.id,
          product_name: productName.trim(),
          platform: [adPlatform],
          language: 'bn',
          framework: adFramework,
          num_variations: 3,
        },
      });
      if (error || !data?.ads?.length) {
        toast.error('বিজ্ঞাপন তৈরি করতে সমস্যা হয়েছে');
        setGenerating(false);
        return;
      }
      setAds(data.ads);
      goTo(4);
    } catch {
      toast.error('সমস্যা হয়েছে');
    } finally {
      setGenerating(false);
    }
  };

  // Step 4 → complete onboarding
  const handleComplete = async () => {
    if (!activeWorkspace) return;
    setCompleting(true);
    try {
      await supabase.functions.invoke('complete-onboarding', {
        body: { workspace_id: activeWorkspace.id },
      });
      await refreshProfile();
      navigate('/dashboard', { replace: true });
    } catch {
      // Fallback: mark directly
      await supabase.from('profiles').update({ onboarding_complete: true } as any).eq('id', user!.id);
      await refreshProfile();
      navigate('/dashboard', { replace: true });
    } finally {
      setCompleting(false);
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

  // Animated score count-up
  const bestAd = ads.length > 0 ? ads.reduce((a, b) => (a.dhoom_score > b.dhoom_score ? a : b)) : null;
  const otherAds = ads.filter(a => a !== bestAd);

  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    if (step !== 4 || !bestAd) return;
    let current = 0;
    const target = bestAd.dhoom_score;
    const iv = setInterval(() => {
      current += Math.ceil(target / 30);
      if (current >= target) { current = target; clearInterval(iv); }
      setDisplayScore(current);
    }, 40);
    return () => clearInterval(iv);
  }, [step, bestAd]);

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

  const scoreColor = (s: number) => s >= 75 ? 'text-[hsl(var(--brand-green))]' : s >= 50 ? 'text-[hsl(var(--brand-yellow))]' : 'text-destructive';

  const dnaFields: { key: keyof ShopDNA; icon: string; label: string }[] = [
    { key: 'shop_name', icon: '🏪', label: 'শপের নাম' },
    { key: 'industry', icon: '🏭', label: 'ইন্ডাস্ট্রি' },
    { key: 'target_audience', icon: '🎯', label: 'টার্গেট অডিয়েন্স' },
    { key: 'brand_tone', icon: '💬', label: 'ব্র্যান্ড ভয়েস' },
    { key: 'key_products', icon: '📦', label: 'মূল পণ্য' },
    { key: 'unique_selling', icon: '⭐', label: 'বিশেষত্ব' },
    { key: 'price_range', icon: '💰', label: 'মূল্য পরিসীমা' },
  ];

  const productChips = dna?.key_products?.split(',').map(p => p.trim()).filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="grain-overlay" />

      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[700px] mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="font-bn text-[15px] font-bold text-primary-foreground leading-none">আ</span>
            </div>
            <span className="font-en text-lg font-[800] text-foreground tracking-[-0.02em]">AdDhoom</span>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-0">
            {[1, 2, 3, 4].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  s < step ? 'w-5 h-5 bg-[hsl(var(--brand-green))] text-white' :
                  s === step ? 'w-6 h-6 bg-primary text-primary-foreground' :
                  'w-4 h-4 border-2 border-muted-foreground/30'
                }`}>
                  {s < step ? <Check size={12} /> : s === step ? s : null}
                </div>
                {i < 3 && (
                  <div className={`w-8 h-0.5 mx-0.5 ${s < step ? 'bg-[hsl(var(--brand-green))]' : 'border-t-2 border-dashed border-muted-foreground/20'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Skip */}
          <button
            onClick={() => setShowSkipConfirm(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-bn"
          >
            এড়িয়ে যান
          </button>
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
              <p className="text-sm text-foreground font-bn mb-2">
                আপনি পরেও সেটআপ করতে পারবেন। এখন ড্যাশবোর্ডে যাবেন?
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={handleSkip} className="text-sm font-semibold text-primary hover:underline font-bn">
                  হ্যাঁ, ড্যাশবোর্ডে যাই
                </button>
                <button onClick={() => setShowSkipConfirm(false)} className="text-sm text-muted-foreground hover:text-foreground font-bn">
                  না, সেটআপ করি
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="pt-20 pb-12 px-6 max-w-[600px] mx-auto min-h-screen flex flex-col justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          {/* STEP 1 */}
          {step === 1 && (
            <motion.div key="step1" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-bn">ধাপ ১ এর ৪</p>
              <h1 className="text-3xl font-bold text-foreground mb-2 font-bn">আপনার শপ কোথায়?</h1>
              <p className="text-muted-foreground font-bn mb-8 leading-relaxed">
                লিংক দিন — AI নিজেই সব বুঝে নেবে।<br />দোকানের নাম, পণ্য, ব্র্যান্ড ভয়েস।
              </p>

              <div className="space-y-4">
                <input
                  type="url"
                  value={shopUrl}
                  onChange={(e) => setShopUrl(e.target.value)}
                  placeholder={placeholders[platform || 'default']}
                  className="w-full bg-card border-2 border-border rounded-2xl px-5 py-4 text-base font-body focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                />

                <div>
                  <p className="text-sm text-muted-foreground font-bn mb-2">অথবা প্ল্যাটফর্ম বেছে নিন:</p>
                  <div className="flex gap-2">
                    {[
                      { id: 'facebook', label: '🔵 Facebook পেজ' },
                      { id: 'daraz', label: '🛍️ Daraz স্টোর' },
                      { id: 'website', label: '🌐 ওয়েবসাইট' },
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPlatform(p.id)}
                        className={`text-sm font-bn rounded-full px-4 py-2.5 border transition-all ${
                          platform === p.id
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual toggle */}
                <button
                  onClick={() => setShowManual(!showManual)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors font-bn"
                >
                  <ChevronDown size={14} className={`transition-transform ${showManual ? 'rotate-180' : ''}`} />
                  লিংক নেই? নিজে তথ্য দিন
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
                        { key: 'shop_name', label: 'শপের নাম', placeholder: 'যেমন: Fashion Dhaka' },
                        { key: 'industry', label: 'ইন্ডাস্ট্রি', placeholder: 'যেমন: ফ্যাশন ও পোশাক' },
                        { key: 'key_products', label: 'মূল পণ্য', placeholder: 'যেমন: শাড়ি, কুর্তি' },
                        { key: 'target_audience', label: 'টার্গেট অডিয়েন্স', placeholder: 'যেমন: ১৮-৩৫ বছরের নারী' },
                        { key: 'brand_tone', label: 'ব্র্যান্ড ভয়েস', placeholder: 'যেমন: বন্ধুত্বপূর্ণ, আধুনিক' },
                        { key: 'unique_selling', label: 'বিশেষত্ব', placeholder: 'কী আপনাকে আলাদা করে?' },
                        { key: 'price_range', label: 'মূল্য পরিসীমা', placeholder: 'যেমন: ৳৫০০ - ৳৩,০০০' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="text-xs font-semibold text-foreground font-bn mb-1 block">{f.label}</label>
                          <input
                            type="text"
                            value={manualDna[f.key as keyof ShopDNA]}
                            onChange={(e) => setManualDna({ ...manualDna, [f.key]: e.target.value })}
                            placeholder={f.placeholder}
                            className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-bn focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                          />
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-xs text-muted-foreground flex items-center gap-1 font-bn">
                  <Lock size={12} /> আমরা শুধু পাবলিক তথ্য দেখি। কোনো লগইন বা পাসওয়ার্ড লাগবে না।
                </p>

                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || (!shopUrl.trim() && !showManual)}
                  className="w-full bg-gradient-cta text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-orange-glow hover:scale-[1.01] transition-all disabled:opacity-50 font-bn flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <><Sparkles size={18} className="animate-spin" /> 🔍 তথ্য সংগ্রহ হচ্ছে...</>
                  ) : (
                    <>পরবর্তী <ChevronRight size={18} /></>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2 */}
          {step === 2 && dna && (
            <motion.div key="step2" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-bn">ধাপ ২ এর ৪</p>
              <h1 className="text-3xl font-bold text-foreground mb-2 font-bn">AI আপনার শপ বুঝেছে! ✨</h1>
              <p className="text-muted-foreground font-bn mb-8">নিচের তথ্য দেখুন — ঠিক আছে কি?</p>

              <div className="space-y-3">
                {dnaFields.map((field, i) => (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15, duration: 0.3 }}
                    className="bg-card rounded-[14px] p-4 border-l-4 border-l-primary"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs uppercase text-muted-foreground tracking-wider font-bn">{field.icon} {field.label}</span>
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
                        placeholder="AI বুঝতে পারেনি — নিজে লিখুন"
                        className="w-full bg-transparent border-b border-primary text-base font-semibold font-bn focus:outline-none text-foreground"
                      />
                    ) : (
                      <p className={`text-base font-semibold font-bn ${dna[field.key] ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                        {dna[field.key] || 'AI বুঝতে পারেনি — ক্লিক করে লিখুন'}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>

              <p className="text-center text-sm text-muted-foreground font-bn mt-6 mb-3">
                সব ঠিক আছে? আসুন প্রথম বিজ্ঞাপন বানাই!
              </p>

              <button
                onClick={handleSaveDna}
                className="w-full bg-gradient-cta text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-orange-glow hover:scale-[1.01] transition-all font-bn flex items-center justify-center gap-2"
              >
                পরবর্তী <ChevronRight size={18} />
              </button>

              <button onClick={() => { handleSaveDna(); }} className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-3 font-bn">
                সব পরে ঠিক করবো →
              </button>
            </motion.div>
          )}

          {/* STEP 3 */}
          {step === 3 && !generating && (
            <motion.div key="step3" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-bn">ধাপ ৩ এর ৪</p>
              <h1 className="text-3xl font-bold text-foreground mb-2 font-bn">প্রথম বিজ্ঞাপন তৈরি করুন</h1>
              <p className="text-muted-foreground font-bn mb-8">শুধু পণ্যের নাম দিন। বাকি সব AI করবে।</p>

              <div className="space-y-5">
                {/* Product name */}
                <div>
                  <label className="text-sm font-semibold text-foreground font-bn mb-2 block">পণ্যের নাম *</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="কোন পণ্যের বিজ্ঞাপন বানাবেন?"
                    className="w-full bg-card border-2 border-border rounded-2xl px-5 py-4 text-base font-bn focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                  />
                  {productChips.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {productChips.map(chip => (
                        <button
                          key={chip}
                          onClick={() => setProductName(chip)}
                          className="text-xs font-bn rounded-full px-3 py-1.5 border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Platform */}
                <div>
                  <label className="text-sm font-semibold text-foreground font-bn mb-2 block">প্ল্যাটফর্ম</label>
                  <div className="flex gap-2">
                    {['facebook', 'instagram', 'daraz'].map(p => (
                      <button
                        key={p}
                        onClick={() => setAdPlatform(p)}
                        className={`text-sm font-bn rounded-full px-5 py-2.5 border transition-all capitalize ${
                          adPlatform === p ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {p === 'facebook' ? 'Facebook' : p === 'instagram' ? 'Instagram' : 'Daraz'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Framework */}
                <div>
                  <label className="text-sm font-semibold text-foreground font-bn mb-2 block">ফ্রেমওয়ার্ক</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'FOMO', label: '🔥 জরুরি অফার' },
                      { id: 'social_proof', label: '👥 সামাজিক প্রমাণ' },
                      { id: 'PAS', label: '💡 সমস্যার সমাধান' },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setAdFramework(f.id)}
                        className={`text-sm font-bn rounded-full px-4 py-2.5 border transition-all ${
                          adFramework === f.id ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Confidence */}
                {dna && (
                  <div className="rounded-xl border border-[hsl(var(--brand-green))]/15 bg-[hsl(var(--brand-green))]/5 p-4">
                    <p className="text-sm font-bn text-foreground">
                      ✓ AI আপনার শপের তথ্য ব্যবহার করবে:<br />
                      <span className="text-muted-foreground">
                        {dna.shop_name} · {dna.industry} · {dna.brand_tone}
                      </span>
                    </p>
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={!productName.trim()}
                  className="w-full bg-gradient-cta text-primary-foreground rounded-2xl py-[18px] text-lg font-bold shadow-orange-glow hover:scale-[1.01] transition-all disabled:opacity-50 font-bn flex items-center justify-center gap-2"
                >
                  🚀 প্রথম বিজ্ঞাপন তৈরি করুন
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3 Loading */}
          {step === 3 && generating && (
            <motion.div key="step3-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center py-20">
              <div className="relative mb-6">
                <Rocket size={48} className="text-primary animate-bounce" />
              </div>
              <p className="text-lg font-semibold text-foreground font-bn animate-pulse">{loadingMessages[loadingMsgIdx]}</p>
              <div className="w-48 h-1.5 rounded-full bg-secondary overflow-hidden mt-4">
                <motion.div
                  className="h-full bg-gradient-brand rounded-full"
                  initial={{ width: '5%' }}
                  animate={{ width: '90%' }}
                  transition={{ duration: 8, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )}

          {/* STEP 4 */}
          {step === 4 && bestAd && (
            <motion.div key="step4" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_SLIDE.transition}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-bn">ধাপ ৪ এর ৪</p>
              <h1 className="text-3xl font-bold text-foreground mb-6 font-bn">🎉 আপনার প্রথম বিজ্ঞাপন তৈরি হয়েছে!</h1>

              {/* Confetti */}
              <ConfettiBurst />

              {/* Best Ad Card */}
              <div className="bg-card rounded-3xl shadow-[0_16px_64px_rgba(255,81,0,0.12)] border-t-4 border-t-primary p-7 max-w-[520px] mx-auto mb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-muted-foreground font-bn">আপনার বিজ্ঞাপন</span>
                  <span className={`text-lg font-bold font-bn ${scoreColor(displayScore)}`} ref={scoreRef}>
                    ধুম স্কোর: {displayScore} 🔥
                  </span>
                </div>

                <div className="border-l-4 border-l-primary bg-primary/5 rounded-r-[10px] px-4 py-3 mb-3">
                  <p className="text-xl font-bold text-foreground font-bn">{bestAd.headline}</p>
                </div>

                <p className="text-base text-muted-foreground font-bn leading-[1.7] mb-3">{bestAd.body}</p>

                <p className="text-primary font-bold font-bn">→ {bestAd.cta}</p>
              </div>

              {/* Personalization callout */}
              {dna && (
                <div className="bg-[hsl(var(--brand-purple))]/5 border border-[hsl(var(--brand-purple))]/15 rounded-xl px-4 py-3 text-center mb-4 max-w-[520px] mx-auto">
                  <p className="text-[13px] text-[hsl(var(--brand-purple))] font-bn">
                    ✨ এই বিজ্ঞাপনটি {dna.shop_name}-এর জন্য কাস্টমাইজ করা হয়েছে।<br />
                    {dna.brand_tone} ভয়েস ব্যবহার করা হয়েছে।
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 max-w-[520px] mx-auto mb-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${bestAd.headline}\n\n${bestAd.body}\n\n${bestAd.cta}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex-1 border border-border rounded-xl py-3 text-sm font-semibold text-foreground hover:bg-secondary/50 transition-colors font-bn flex items-center justify-center gap-2"
                >
                  {copied ? '✓ কপি হয়েছে' : <><Copy size={16} /> 📋 কপি করুন</>}
                </button>
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="flex-1 border border-border rounded-xl py-3 text-sm font-semibold text-foreground hover:bg-secondary/50 transition-colors font-bn"
                >
                  ⚡ আরো বিজ্ঞাপন দেখুন
                </button>
              </div>

              {/* Other variations */}
              <AnimatePresence>
                {showMore && otherAds.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3 max-w-[520px] mx-auto overflow-hidden mb-4"
                  >
                    {otherAds.map((ad, i) => (
                      <div key={i} className="bg-card rounded-2xl border border-border p-5">
                        <div className="flex justify-between mb-2">
                          <span className="text-xs text-muted-foreground font-bn">বিকল্প {i + 2}</span>
                          <span className={`text-sm font-bold font-bn ${scoreColor(ad.dhoom_score)}`}>
                            {ad.dhoom_score} 🔥
                          </span>
                        </div>
                        <p className="text-base font-bold text-foreground font-bn mb-1">{ad.headline}</p>
                        <p className="text-sm text-muted-foreground font-bn leading-relaxed">{ad.body}</p>
                        <p className="text-primary font-semibold text-sm font-bn mt-2">→ {ad.cta}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Completion */}
              <div className="text-center max-w-[520px] mx-auto">
                <p className="text-lg font-bold text-[hsl(var(--brand-green))] font-bn mb-3">🏁 সেটআপ সম্পন্ন!</p>

                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-full bg-gradient-cta text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-orange-glow hover:scale-[1.01] transition-all font-bn mb-4"
                >
                  {completing ? 'অপেক্ষা করুন...' : 'AdDhoom ড্যাশবোর্ডে যান →'}
                </button>

                <div className="space-y-1 text-left">
                  <p className="text-[13px] text-muted-foreground font-bn">✓ শপ DNA সংরক্ষিত</p>
                  <p className="text-[13px] text-muted-foreground font-bn">✓ প্রথম বিজ্ঞাপন তৈরি</p>
                  <p className="text-[13px] text-muted-foreground font-bn">✓ ধুম স্কোর ক্যালিব্রেটেড</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// CSS-only confetti burst
const ConfettiBurst = () => {
  const colors = ['hsl(19,100%,50%)', 'hsl(155,100%,36%)', 'hsl(43,100%,50%)', 'hsl(253,79%,58%)'];
  return (
    <div className="relative h-0 overflow-visible pointer-events-none -mt-2 mb-4">
      {Array.from({ length: 20 }).map((_, i) => {
        const color = colors[i % colors.length];
        const angle = (i / 20) * 360;
        const distance = 60 + Math.random() * 80;
        const size = 6 + Math.random() * 4;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-0 rounded-full"
            style={{ width: size, height: size, backgroundColor: color }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle * Math.PI / 180) * distance,
              y: Math.sin(angle * Math.PI / 180) * distance - 30,
              opacity: 0,
              scale: 0.3,
            }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
};

export default Onboarding;
