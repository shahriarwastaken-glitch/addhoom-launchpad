import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, ChevronRight, Crown, Globe, Lock,
  Pencil, Search, ShoppingBag, Sparkles, Store, Target,
  MessageSquare, Package, Star, DollarSign, Factory, Zap,
  Palette, Type, Image as ImageIcon, Tags, X, Plus, ArrowLeft, Info, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import VisualIdentitySection from '@/components/dashboard/VisualIdentitySection';
import ProductsGrid, { ProductEditModal } from '@/components/dashboard/ProductsGrid';
import DNAScoreIndicator from '@/components/dashboard/DNAScoreIndicator';
import StyleCalibration from '@/components/dashboard/StyleCalibration';
import EntryPointCards, { type EntryPointType } from '@/components/onboarding/EntryPointCards';
import ManualEntryForm from '@/components/onboarding/ManualEntryForm';
import TemplateSelector from '@/components/onboarding/TemplateSelector';
import PhotoUploader from '@/components/onboarding/PhotoUploader';
import type { WorkspaceProduct } from '@/hooks/useWorkspaceProducts';

type ShopDNA = {
  shop_name: string;
  industry: string;
  brand_tone: string;
  target_audience: string;
  key_products: string;
  unique_selling: string;
  price_range: string;
  niche_tags: string[];
};

const STEP_SLIDE = {
  initial: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};
const STEP_TRANSITION = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const };

const TOTAL_STEPS = 4;

const plans = [
  {
    id: 'pro', name: 'Pro', price: '৳2,999', period: '/mo',
    features: ['50 AI ads/day', 'All platforms', 'Competitor analysis', 'AI chat assistant', 'Account Doctor'],
    gradient: 'from-primary to-accent', icon: Zap,
  },
  {
    id: 'agency', name: 'Agency', price: '৳7,999', period: '/mo',
    features: ['All Pro features', 'Unlimited AI ads', 'Video ad generator', 'Content calendar', 'Festival templates', 'Priority support'],
    gradient: 'from-[hsl(var(--brand-purple))] to-primary', icon: Crown,
  },
];

const ANALYZING_STEPS = [
  { icon: Search, text: 'Analyzing source...' },
  { icon: Palette, text: 'Extracting brand colors & fonts...' },
  { icon: Package, text: 'Building product catalog...' },
  { icon: Sparkles, text: 'Understanding brand identity...' },
  { icon: Check, text: 'Ready!' },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, profile, activeWorkspace, refreshProfile, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1
  const [entryPoint, setEntryPoint] = useState<EntryPointType | null>(null);
  const [shopUrl, setShopUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [extractionQuality, setExtractionQuality] = useState<string>('full');

  // Step 2
  const [dna, setDna] = useState<ShopDNA | null>(null);
  const [brandColors, setBrandColors] = useState<Array<{ hex: string; role: string; source: string }>>([]);
  const [brandFonts, setBrandFonts] = useState<{ heading?: string; body?: string; source: string }>({ source: 'extracted' });
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [products, setProducts] = useState<WorkspaceProduct[]>([]);
  const [dnaScore, setDnaScore] = useState(0);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'brand' | 'products'>('brand');
  const [editingProduct, setEditingProduct] = useState<Partial<WorkspaceProduct> | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Step 4 — plan
  const [planLoading, setPlanLoading] = useState<string | null>(null);

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

  // Invoke the edge function for URL-based entry points
  const handleUrlAnalyze = async (platform: string) => {
    if (!shopUrl.trim() || !activeWorkspace) return;
    setAnalyzing(true);
    setAnalyzeStep(0);

    const interval = setInterval(() => {
      setAnalyzeStep(prev => {
        if (prev >= ANALYZING_STEPS.length - 1) { clearInterval(interval); return prev; }
        return prev + 1;
      });
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

      applyResults(data);
      setTimeout(() => { setAnalyzing(false); goTo(2); }, 800);
    } catch {
      clearInterval(interval);
      toast.error('Something went wrong.');
      setAnalyzing(false);
    }
  };

  // Manual form submit
  const handleManualSubmit = async (formData: any) => {
    if (!activeWorkspace) return;
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('setup-shop-dna', {
        body: { workspace_id: activeWorkspace.id, platform: 'manual', payload: { form_data: formData } },
      });
      if (error || !data?.success) {
        // Fallback: use form data directly
        setDna({
          shop_name: formData.shop_name,
          industry: formData.industry,
          brand_tone: formData.brand_tone,
          target_audience: formData.target_audience,
          key_products: formData.key_products,
          unique_selling: '',
          price_range: formData.price_range,
          niche_tags: [],
        });
        setExtractionQuality('manual');
        setAnalyzing(false);
        goTo(2);
        return;
      }
      applyResults(data);
      setAnalyzing(false);
      goTo(2);
    } catch {
      toast.error('Something went wrong.');
      setAnalyzing(false);
    }
  };

  // Template submit
  const handleTemplateSelect = async (industry: string, templateData: any) => {
    if (!activeWorkspace) return;
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('setup-shop-dna', {
        body: { workspace_id: activeWorkspace.id, platform: 'template', payload: { industry, template_data: templateData } },
      });
      if (error || !data?.success) {
        // Fallback
        setDna({
          shop_name: 'My Shop',
          industry,
          ...templateData,
          niche_tags: templateData.niche_tags || [],
        });
        setExtractionQuality('template');
        setAnalyzing(false);
        goTo(2);
        return;
      }
      applyResults(data);
      setAnalyzing(false);
      goTo(2);
    } catch {
      setAnalyzing(false);
      toast.error('Something went wrong.');
    }
  };

  // Photo upload submit
  const handlePhotosSubmit = async (base64Images: string[]) => {
    if (!activeWorkspace) return;
    setAnalyzing(true);
    setAnalyzeStep(0);

    const interval = setInterval(() => {
      setAnalyzeStep(prev => {
        if (prev >= ANALYZING_STEPS.length - 1) { clearInterval(interval); return prev; }
        return prev + 1;
      });
    }, 2500);

    try {
      const { data, error } = await supabase.functions.invoke('setup-shop-dna', {
        body: { workspace_id: activeWorkspace.id, platform: 'photos', payload: { images: base64Images } },
      });
      clearInterval(interval);
      setAnalyzeStep(ANALYZING_STEPS.length - 1);

      if (error || !data?.success) {
        toast.error('Could not analyze photos. Please try manually.');
        setAnalyzing(false);
        return;
      }
      applyResults(data);
      setTimeout(() => { setAnalyzing(false); goTo(2); }, 800);
    } catch {
      clearInterval(interval);
      toast.error('Something went wrong.');
      setAnalyzing(false);
    }
  };

  const applyResults = (data: any) => {
    setDna({ ...data.dna, niche_tags: data.dna?.niche_tags || [] });
    setBrandColors(data.brand_colors || []);
    setBrandFonts(data.brand_fonts || { source: 'extracted' });
    setBrandLogoUrl(data.brand_logo_url || null);
    setProducts(data.products || []);
    setDnaScore(data.dna_score || 0);
    setExtractionQuality(data.extraction_quality || 'full');
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
        brand_colors: brandColors,
        brand_fonts: brandFonts,
        brand_logo_url: brandLogoUrl,
        niche_tags: dna.niche_tags?.slice(0, 5) || [],
      } as any).eq('id', activeWorkspace.id);

      await supabase.from('profiles').update({ onboarding_complete: true } as any).eq('id', user!.id);
      await refreshProfile();
      goTo(3);
    } catch {
      toast.error('Failed to save. Please try again.');
    }
  };

  // Step 3 → save style preferences
  const handleStyleComplete = async (preferences: any) => {
    if (!activeWorkspace) { goTo(4); return; }
    try {
      await supabase.functions.invoke('save-style-preferences', {
        body: { workspace_id: activeWorkspace.id, ...preferences },
      });
      await refreshProfile();
    } catch { /* continue anyway */ }
    goTo(4);
  };

  // Step 4 → select plan
  const handleSelectPlan = async (planId: string) => {
    setPlanLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { plan: planId, billing_cycle: 'monthly' },
      });
      if (error) throw error;
      if (data?.gateway_url) window.location.href = data.gateway_url;
      else if (data?.dev_mode) {
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

  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const handleSkip = async () => {
    try {
      await supabase.from('profiles').update({ onboarding_complete: false } as any).eq('id', user!.id);
      navigate('/dashboard', { replace: true });
    } catch { navigate('/dashboard', { replace: true }); }
  };

  const updateDna = (field: keyof ShopDNA, value: any) => {
    if (dna) setDna({ ...dna, [field]: value });
  };

  const addNicheTag = () => {
    if (!newTag.trim() || !dna || (dna.niche_tags?.length || 0) >= 5) return;
    updateDna('niche_tags', [...(dna.niche_tags || []), newTag.trim()]);
    setNewTag('');
  };

  const removeNicheTag = (index: number) => {
    if (!dna) return;
    updateDna('niche_tags', (dna.niche_tags || []).filter((_, i) => i !== index));
  };

  const handleProductSave = async (data: Partial<WorkspaceProduct>) => {
    if (!activeWorkspace) return;
    if (editingProduct?.id) {
      await supabase.functions.invoke('workspace-products', {
        body: { action: 'update', product_id: editingProduct.id, product: data },
      });
    } else {
      await supabase.functions.invoke('workspace-products', {
        body: { action: 'add', workspace_id: activeWorkspace.id, product: data },
      });
    }
    const { data: refreshed } = await supabase.functions.invoke('workspace-products', {
      body: { action: 'list', workspace_id: activeWorkspace.id, active_only: false },
    });
    if (refreshed?.success) setProducts(refreshed.products);
    setShowProductModal(false);
    setEditingProduct(null);
  };

  const handleProductToggle = async (id: string, active: boolean) => {
    await supabase.functions.invoke('workspace-products', {
      body: { action: 'update', product_id: id, product: { is_active: active } },
    });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: active } : p));
  };

  const handleProductDelete = async (id: string) => {
    if (!activeWorkspace) return;
    await supabase.functions.invoke('workspace-products', {
      body: { action: 'delete', product_id: id, workspace_id: activeWorkspace.id },
    });
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-primary text-xl font-bold">AdDhoom</div></div>;
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

  // Count missing fields for quality banner
  const missingFieldCount = dna ? dnaFields.filter(f => !dna[f.key]).length : 0;

  // URL input for website/facebook/daraz
  const renderUrlInput = () => {
    const placeholders: Record<string, string> = {
      website: 'https://yourshop.com',
      facebook: 'facebook.com/yourpagename',
      daraz: 'daraz.com.bd/shop/yourshop',
    };
    const labels: Record<string, string> = {
      website: 'Your website URL',
      facebook: 'Your Facebook Page URL',
      daraz: 'Your Daraz Store URL',
    };
    return (
      <div className="mt-5 space-y-4">
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{labels[entryPoint!]}</label>
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input type="url" value={shopUrl} onChange={e => setShopUrl(e.target.value)}
              placeholder={placeholders[entryPoint!]}
              className="w-full bg-card border-2 border-border rounded-2xl pl-11 pr-5 py-4 text-base focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground" />
          </div>
        </div>
        {entryPoint === 'facebook' && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info size={12} /> Facebook limits what we can read. We'll extract what's publicly visible and you can fill in the rest.
          </p>
        )}
        <button onClick={() => handleUrlAnalyze(entryPoint!)} disabled={!shopUrl.trim()}
          className="w-full bg-gradient-cta text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-orange-glow hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          Continue →
        </button>
      </div>
    );
  };

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
          <div className="flex items-center gap-0">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  s < step ? 'w-5 h-5 bg-[hsl(var(--brand-green))] text-white' :
                  s === step ? 'w-6 h-6 bg-primary text-primary-foreground' :
                  'w-4 h-4 border-2 border-muted-foreground/30'
                }`}>
                  {s < step ? <Check size={12} /> : s === step ? s : null}
                </div>
                {i < TOTAL_STEPS - 1 && (
                  <div className={`w-8 h-0.5 mx-0.5 ${s < step ? 'bg-[hsl(var(--brand-green))]' : 'border-t-2 border-dashed border-muted-foreground/20'}`} />
                )}
              </div>
            ))}
          </div>
          {step < TOTAL_STEPS && (
            <button onClick={() => setShowSkipConfirm(true)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Skip</button>
          )}
          {step >= TOTAL_STEPS && <div className="w-8" />}
        </div>
      </div>

      {/* Skip Confirmation */}
      <AnimatePresence>
        {showSkipConfirm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 left-0 right-0 z-40 bg-card border-b border-border px-6 py-3">
            <div className="max-w-[600px] mx-auto text-center">
              <p className="text-sm text-foreground mb-2">You can always complete setup later. Go to dashboard now?</p>
              <div className="flex gap-3 justify-center">
                <button onClick={handleSkip} className="text-sm font-semibold text-primary hover:underline">Yes, go to dashboard</button>
                <button onClick={() => setShowSkipConfirm(false)} className="text-sm text-muted-foreground hover:text-foreground">No, continue setup</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="pt-20 pb-12 px-6 max-w-[680px] mx-auto min-h-screen flex flex-col justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          {/* STEP 1 — Entry Point Selection */}
          {step === 1 && !analyzing && (
            <motion.div key="step1" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Step 1 of {TOTAL_STEPS}</p>
              <h1 className="text-3xl font-bold text-foreground mb-2">How do you want to set up your shop?</h1>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Choose how you want to get started. You can always edit everything later.
              </p>

              <EntryPointCards selected={entryPoint} onSelect={setEntryPoint} />

              {/* Per-entry-point flow below cards */}
              <AnimatePresence mode="wait">
                {entryPoint && ['website', 'facebook', 'daraz'].includes(entryPoint) && (
                  <motion.div key="url-input" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
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
            </motion.div>
          )}

          {/* ANALYZING STATE */}
          {step === 1 && analyzing && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-8">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <Store className="text-primary" size={36} />
                </div>
              </div>
              <div className="space-y-3 max-w-sm mx-auto">
                {ANALYZING_STEPS.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: i <= analyzeStep ? 1 : 0.3, x: 0 }} transition={{ delay: i * 0.1, duration: 0.3 }}
                    className="flex items-center gap-3">
                    {i < analyzeStep ? (
                      <Check size={16} className="text-[hsl(var(--brand-green))] flex-shrink-0" />
                    ) : i === analyzeStep ? (
                      <s.icon size={16} className="text-primary animate-pulse flex-shrink-0" />
                    ) : (
                      <s.icon size={16} className="text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${i <= analyzeStep ? 'text-foreground' : 'text-muted-foreground/40'}`}>{s.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Brand Review */}
          {step === 2 && dna && (
            <motion.div key="step2" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Step 2 of {TOTAL_STEPS}</p>
              <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
                AI understood your brand <Sparkles size={20} className="text-primary" />
              </h1>
              <p className="text-muted-foreground mb-5 text-sm">Review and edit if needed, then continue.</p>

              {/* Extraction Quality Banner */}
              {extractionQuality === 'partial' && (
                <div className="mb-4 p-3 rounded-xl border border-[hsl(40,100%,50%)]/30 bg-[hsl(40,100%,50%)]/[0.08] flex items-start gap-2">
                  <AlertTriangle size={16} className="text-[hsl(40,100%,40%)] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    Some fields couldn't be extracted automatically. Please review and fill in any missing fields below.
                  </p>
                </div>
              )}
              {(extractionQuality === 'manual' || extractionQuality === 'template') && (
                <div className="mb-4 p-3 rounded-xl border border-[hsl(var(--brand-purple))]/20 bg-[hsl(var(--brand-purple))]/[0.06] flex items-start gap-2">
                  <Info size={16} className="text-[hsl(var(--brand-purple))] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    You can always update this information later in Settings → Shop DNA.
                  </p>
                </div>
              )}

              {/* Tabs */}
              <div className="bg-secondary rounded-xl p-1 flex mb-6">
                {(['brand', 'products'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === tab ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}>
                    {tab === 'brand' ? (
                      <>
                        <Palette size={14} /> Brand Info
                        {missingFieldCount > 0 && <span className="text-[10px] bg-primary/15 text-primary rounded-full px-1.5 py-0.5 font-bold">{missingFieldCount} missing</span>}
                      </>
                    ) : (
                      <><Package size={14} /> Products ({products.length})</>
                    )}
                  </button>
                ))}
              </div>

              {activeTab === 'brand' ? (
                <div className="space-y-6">
                  <VisualIdentitySection
                    brandColors={brandColors}
                    brandFonts={brandFonts}
                    brandLogoUrl={brandLogoUrl}
                    onUpdateColors={setBrandColors}
                    onUpdateFonts={setBrandFonts}
                  />
                  <div className="h-px bg-border" />
                  <div className="space-y-3">
                    {dnaFields.map((field, i) => {
                      const isEmpty = !dna[field.key];
                      return (
                        <motion.div key={field.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}
                          className={`bg-card rounded-[14px] p-4 border-l-4 ${isEmpty ? 'border-l-primary' : 'border-l-primary'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                              {field.icon} {field.label} {isEmpty && <span className="text-primary">*</span>}
                            </span>
                            <button onClick={() => setEditingField(editingField === field.key ? null : field.key)}
                              className="text-muted-foreground hover:text-primary transition-colors"><Pencil size={14} /></button>
                          </div>
                          {editingField === field.key ? (
                            <input autoFocus value={(dna[field.key] as string) || ''} onChange={e => updateDna(field.key, e.target.value)}
                              onBlur={() => setEditingField(null)} onKeyDown={e => e.key === 'Enter' && setEditingField(null)}
                              placeholder="Not found — add manually"
                              className={`w-full bg-transparent border-b text-base font-semibold focus:outline-none text-foreground ${isEmpty ? 'border-primary' : 'border-primary'}`} />
                          ) : (
                            <p className={`text-base font-semibold ${dna[field.key] ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                              {(dna[field.key] as string) || 'Not found — click pencil to add'}
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Niche Tags */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Tags size={12} /> Niche Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(dna.niche_tags || []).map((tag, i) => (
                        <span key={i} className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1.5 font-medium flex items-center gap-1">
                          {tag}
                          <button onClick={() => removeNicheTag(i)} className="hover:text-destructive"><X size={12} /></button>
                        </span>
                      ))}
                      {(dna.niche_tags?.length || 0) < 5 && (
                        <div className="flex items-center gap-1">
                          <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNicheTag()}
                            placeholder="Add tag" className="text-xs bg-card border border-border rounded-full px-3 py-1.5 w-24 focus:outline-none focus:border-primary text-foreground" />
                          <button onClick={addNicheTag} className="text-xs text-primary"><Plus size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <ProductsGrid
                  products={products}
                  onToggleActive={handleProductToggle}
                  onEdit={p => { setEditingProduct(p); setShowProductModal(true); }}
                  onDelete={handleProductDelete}
                  onAdd={() => { setEditingProduct({}); setShowProductModal(true); }}
                />
              )}

              {/* Missing fields nudge */}
              {missingFieldCount > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  {missingFieldCount} field{missingFieldCount > 1 ? 's' : ''} empty — AI works better with more information
                </p>
              )}

              {/* Bottom: DNA Score + Next */}
              <div className="mt-6 flex items-center justify-between">
                <DNAScoreIndicator score={dnaScore} size="sm" />
                <button onClick={handleSaveDna}
                  className="bg-gradient-cta text-primary-foreground rounded-2xl px-8 py-3 text-base font-bold shadow-orange-glow hover:scale-[1.01] transition-all flex items-center gap-2">
                  Next: Style Preferences <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3 — Style Calibration */}
          {step === 3 && (
            <motion.div key="step3" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Step 3 of {TOTAL_STEPS}</p>
              <StyleCalibration onComplete={handleStyleComplete} onSkip={() => goTo(4)} />
            </motion.div>
          )}

          {/* STEP 4 — Choose Plan */}
          {step === 4 && (
            <motion.div key="step4" custom={direction} variants={STEP_SLIDE} initial="initial" animate="animate" exit="exit" transition={STEP_TRANSITION}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Step {TOTAL_STEPS} of {TOTAL_STEPS}</p>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                Choose your plan <Crown size={24} className="text-primary" />
              </h1>
              <p className="text-muted-foreground mb-8">Your brand DNA is saved. Pick a plan to start creating AI ads.</p>

              <div className="space-y-4">
                {plans.map(plan => (
                  <div key={plan.id} className="bg-card rounded-2xl border border-border overflow-hidden shadow-warm">
                    <div className={`bg-gradient-to-r ${plan.gradient} p-5 text-white`}>
                      <div className="flex items-center gap-2"><plan.icon size={20} /><h3 className="text-lg font-bold">{plan.name}</h3></div>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <span className="text-2xl font-mono font-bold">{plan.price}</span>
                        <span className="text-sm opacity-80">{plan.period}</span>
                      </div>
                    </div>
                    <div className="p-5 space-y-2.5">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check size={14} className="text-[hsl(var(--brand-green))] flex-shrink-0" /><span className="text-foreground">{f}</span>
                        </div>
                      ))}
                      <button onClick={() => handleSelectPlan(plan.id)} disabled={planLoading === plan.id}
                        className="w-full mt-3 bg-gradient-cta text-primary-foreground rounded-xl py-3 font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
                        {planLoading === plan.id ? <Sparkles size={16} className="animate-spin" /> : <><Zap size={16} /> Get {plan.name}</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {dna && (
                <div className="mt-6 rounded-xl border border-[hsl(var(--brand-green))]/15 bg-[hsl(var(--brand-green))]/5 p-4">
                  <p className="text-sm text-foreground flex items-center gap-1.5">
                    <Check size={14} className="text-[hsl(var(--brand-green))]" />
                    Shop DNA saved: {dna.shop_name} · {dna.industry}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    AI will use your brand data to create personalized ads as soon as you subscribe.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Product Edit Modal */}
      {showProductModal && (
        <ProductEditModal
          product={editingProduct}
          onSave={handleProductSave}
          onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
        />
      )}
    </div>
  );
};

export default Onboarding;
