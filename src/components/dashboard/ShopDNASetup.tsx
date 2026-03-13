import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Globe, Store, Check, Loader2, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ShopDNA = {
  shop_name: string;
  industry: string;
  brand_tone: string;
  target_audience: string;
  key_products: string;
  unique_selling: string;
  price_range: string;
};

const INDUSTRIES = ['fashion', 'electronics', 'beauty', 'food', 'home_goods', 'health', 'sports', 'kids', 'other'];
const TONES = ['friendly', 'professional', 'urgent', 'humorous'];
const PRICE_RANGES = ['budget', 'mid_range', 'premium'];

const ShopDNASetup = ({ onComplete }: { onComplete: () => void }) => {
  const { t } = useLanguage();
  const { activeWorkspace, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<'url' | 'analyzing' | 'review'>('url');
  const [shopUrl, setShopUrl] = useState('');
  const [dna, setDna] = useState<ShopDNA | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAnalyze = async () => {
    if (!shopUrl.trim() || !activeWorkspace) return;

    setStep('analyzing');

    try {
      const { data, error } = await supabase.functions.invoke('setup-shop-dna', {
        body: { workspace_id: activeWorkspace.id, shop_url: shopUrl.trim() },
      });

      if (error || !data?.success) {
        toast({
          title: t('সমস্যা হয়েছে', 'Something went wrong'),
          description: data?.message || t('আবার চেষ্টা করুন', 'Please try again'),
          variant: 'destructive',
        });
        setStep('url');
        return;
      }

      setDna(data.dna);
      setStep('review');
    } catch (err) {
      console.error(err);
      toast({
        title: t('সমস্যা হয়েছে', 'Error'),
        description: t('সার্ভারে সমস্যা। আবার চেষ্টা করুন।', 'Server error. Please try again.'),
        variant: 'destructive',
      });
      setStep('url');
    }
  };

  const handleSave = async () => {
    if (!dna || !activeWorkspace) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          shop_name: dna.shop_name,
          industry: dna.industry,
          brand_tone: dna.brand_tone,
          target_audience: dna.target_audience,
          key_products: dna.key_products,
          unique_selling: dna.unique_selling,
          price_range: dna.price_range,
          shop_url: shopUrl,
        } as any)
        .eq('id', activeWorkspace.id);

      if (error) throw error;

      // Note: Do NOT set onboarding_complete here — this is a dashboard re-setup, not onboarding completion

      await refreshProfile();

      toast({
        title: t('সফল!', 'Success!'),
        description: t('শপের তথ্য সংরক্ষিত হয়েছে', 'Shop DNA saved successfully'),
      });

      onComplete();
    } catch (err) {
      console.error(err);
      toast({
        title: t('সমস্যা', 'Error'),
        description: t('সংরক্ষণ করতে পারেনি', 'Could not save'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_complete: true } as any)
        .eq('id', activeWorkspace?.owner_id);
      await refreshProfile();
      onComplete();
    } catch {
      onComplete();
    }
  };

  const updateDna = (field: keyof ShopDNA, value: string) => {
    if (dna) setDna({ ...dna, [field]: value });
  };

  // STEP: URL Input
  if (step === 'url') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 mb-4">
              <Sparkles size={18} />
              <span className="font-semibold text-sm">{t('Shop DNA সেটআপ', 'Shop DNA Setup')}</span>
            </div>
            <h1 className="text-3xl font-heading-bn font-bold text-foreground mb-3">
              {t('আপনার শপ সম্পর্কে বলুন', 'Tell us about your shop')}
            </h1>
            <p className="text-muted-foreground font-body-bn">
              {t(
                'শপের লিংক দিন — AI স্বয়ংক্রিয়ভাবে আপনার ব্র্যান্ড বিশ্লেষণ করবে',
                'Paste your shop link — AI will automatically analyze your brand'
              )}
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-warm p-8 space-y-6">
            <div>
              <label className="text-sm font-semibold text-foreground font-body-bn mb-2 block">
                {t('আপনার শপের লিংক দিন', 'Enter your shop URL')}
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="url"
                  value={shopUrl}
                  onChange={(e) => setShopUrl(e.target.value)}
                  placeholder="https://daraz.com.bd/shop/... অথবা Facebook Shop URL"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-body-bn text-sm"
                />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!shopUrl.trim()}
              className="w-full bg-gradient-cta text-primary-foreground rounded-full py-3.5 text-base font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 font-body-bn flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              {t('AI দিয়ে বিশ্লেষণ করুন', 'Analyze with AI')}
            </button>

            <button
              onClick={handleSkip}
              className="w-full text-muted-foreground text-sm hover:text-foreground transition-colors font-body-bn py-2"
            >
              {t('পরে করব, এখন ড্যাশবোর্ডে যাই →', 'Skip for now, go to dashboard →')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP: Analyzing
  if (step === 'analyzing') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Store className="text-primary" size={36} />
            </div>
            <Loader2 className="absolute -top-2 -right-2 text-primary animate-spin" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-heading-bn font-bold text-foreground mb-2">
              {t('AI আপনার শপ বিশ্লেষণ করছে...', 'AI is analyzing your shop...')}
            </h2>
            <p className="text-muted-foreground font-body-bn">
              {t('কয়েক সেকেন্ড সময় লাগবে', 'This will take a few seconds')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // STEP: Review & Edit
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-brand-green/10 text-brand-green rounded-full px-4 py-2 mb-4">
            <Check size={18} />
            <span className="font-semibold text-sm">{t('বিশ্লেষণ সম্পন্ন', 'Analysis Complete')}</span>
          </div>
          <h1 className="text-3xl font-heading-bn font-bold text-foreground mb-2">
            {t('আপনার Shop DNA', 'Your Shop DNA')}
          </h1>
          <p className="text-muted-foreground font-body-bn flex items-center justify-center gap-1">
            <Edit3 size={14} />
            {t('প্রয়োজনে এডিট করুন, তারপর সেভ করুন', 'Review and edit if needed, then save')}
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-warm p-8 space-y-5">
          {/* Shop Name */}
          <FieldInput
            label={t('শপের নাম', 'Shop Name')}
            value={dna?.shop_name || ''}
            onChange={(v) => updateDna('shop_name', v)}
          />

          {/* Industry */}
          <FieldSelect
            label={t('ইন্ডাস্ট্রি', 'Industry')}
            value={dna?.industry || ''}
            options={INDUSTRIES}
            onChange={(v) => updateDna('industry', v)}
          />

          {/* Brand Tone */}
          <FieldSelect
            label={t('ব্র্যান্ড টোন', 'Brand Tone')}
            value={dna?.brand_tone || ''}
            options={TONES}
            onChange={(v) => updateDna('brand_tone', v)}
          />

          {/* Target Audience */}
          <FieldInput
            label={t('টার্গেট কাস্টমার', 'Target Audience')}
            value={dna?.target_audience || ''}
            onChange={(v) => updateDna('target_audience', v)}
          />

          {/* Key Products */}
          <FieldInput
            label={t('প্রধান পণ্য', 'Key Products')}
            value={dna?.key_products || ''}
            onChange={(v) => updateDna('key_products', v)}
          />

          {/* USP */}
          <FieldInput
            label={t('ইউনিক সেলিং পয়েন্ট', 'Unique Selling Point')}
            value={dna?.unique_selling || ''}
            onChange={(v) => updateDna('unique_selling', v)}
          />

          {/* Price Range */}
          <FieldSelect
            label={t('মূল্য পরিসর', 'Price Range')}
            value={dna?.price_range || ''}
            options={PRICE_RANGES}
            onChange={(v) => updateDna('price_range', v)}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-cta text-primary-foreground rounded-full py-3.5 text-base font-semibold shadow-orange-glow hover:scale-[1.02] transition-transform disabled:opacity-70 font-body-bn flex items-center justify-center gap-2 mt-4"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('সংরক্ষণ হচ্ছে...', 'Saving...')}
              </>
            ) : (
              <>
                <Check size={18} />
                {t('সংরক্ষণ করুন ও ড্যাশবোর্ডে যান', 'Save & Go to Dashboard')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Reusable field components
const FieldInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="text-sm font-semibold text-foreground font-body-bn mb-1.5 block">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
    />
  </div>
);

const FieldSelect = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="text-sm font-semibold text-foreground font-body-bn mb-1.5 block">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`text-sm rounded-full px-4 py-2 transition-colors capitalize ${
            value === opt
              ? 'bg-primary text-primary-foreground'
              : 'border border-border text-muted-foreground hover:border-primary hover:text-primary'
          }`}
        >
          {opt.replace('_', ' ')}
        </button>
      ))}
    </div>
  </div>
);

export default ShopDNASetup;
