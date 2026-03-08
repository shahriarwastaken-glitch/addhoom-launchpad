import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import InputPanel from './InputPanel';
import ResultsPanel from './ResultsPanel';
import RemixModal from './RemixModal';
import type { GeneratorMode, GeneratorFormData, AdResult } from './types';

const defaultForm: GeneratorFormData = {
  productName: '',
  productDesc: '',
  price: '',
  platforms: ['facebook'],
  language: 'bn',
  framework: 'FOMO',
  occasion: 'general',
  tone: 'friendly',
  numVariations: 3,
  productImage: null,
  productImagePreview: null,
  imageFormat: 'square',
  imageStyle: 'clean',
  brandColorPrimary: '#FF5100',
  brandColorSecondary: '#FFFFFF',
};

const AdGeneratorPage = () => {
  const { activeWorkspace } = useAuth();
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const [mode, setMode] = useState<GeneratorMode>('copy');
  const [form, setForm] = useState<GeneratorFormData>(defaultForm);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<AdResult[]>([]);
  const [remixAd, setRemixAd] = useState<AdResult | null>(null);
  const [remixing, setRemixing] = useState(false);
  const [mobileTab, setMobileTab] = useState<'input' | 'results'>('input');

  const handleGenerate = useCallback(async () => {
    if (!activeWorkspace) {
      toast.error(t('প্রথমে একটি শপ তৈরি করুন', 'Create a shop first'));
      return;
    }
    if (!form.productName.trim()) {
      toast.error(t('পণ্যের নাম দিন', 'Enter product name'));
      return;
    }
    if (form.platforms.length === 0) {
      toast.error(t('কমপক্ষে একটি প্ল্যাটফর্ম নির্বাচন করুন', 'Select at least one platform'));
      return;
    }

    setGenerating(true);
    setResults([]);
    if (isMobile) setMobileTab('results');

    try {
      if (mode === 'copy') {
        const { data, error } = await supabase.functions.invoke('generate-ads', {
          body: {
            workspace_id: activeWorkspace.id,
            product_name: form.productName,
            description: form.productDesc,
            price_bdt: form.price ? parseInt(form.price) : undefined,
            platforms: form.platforms,
            language: form.language === 'banglish' ? 'banglish' : 'bn',
            framework: form.framework,
            occasion: form.occasion,
            tone: form.tone,
            num_variations: form.numVariations,
          },
        });

        if (error) throw error;

        if (data?.success && data.ads) {
          setResults(data.ads);
          toast.success(t(`${data.count}টি বিজ্ঞাপন তৈরি হয়েছে`, `${data.count} ads generated`));
        } else {
          toast.error(data?.message || t('সমস্যা হয়েছে', 'Something went wrong'));
        }
      } else {
        // Convert product image to base64 if present
        let product_image_base64: string | undefined;
        let product_image_mime_type = "image/jpeg";
        if (form.productImagePreview) {
          product_image_base64 = form.productImagePreview;
          // Extract mime type from data URI
          const mimeMatch = form.productImagePreview.match(/^data:(image\/\w+);base64,/);
          if (mimeMatch) product_image_mime_type = mimeMatch[1];
        }

        if (!product_image_base64) {
          toast.error(t('পণ্যের ছবি আপলোড করুন', 'Upload a product image'));
          setGenerating(false);
          return;
        }

        // Build headline with price if available
        const adHeadline = form.price 
          ? `${form.productName} — মাত্র ৳${form.price}`
          : form.productName;

        const { data, error } = await supabase.functions.invoke('generate-ad-image', {
          body: {
            workspace_id: activeWorkspace.id,
            product_name: form.productName,
            product_description: form.productDesc,
            format: form.imageFormat,
            style: form.imageStyle,
            brand_color_primary: form.brandColorPrimary,
            brand_color_secondary: form.brandColorSecondary,
            ad_headline: adHeadline,
            ad_body: form.productDesc,
            language: form.language,
            num_variations: form.numVariations,
            product_image_base64,
            product_image_mime_type,
          },
        });

        if (error) throw error;

        if (data?.success && data.images) {
          const imageAds: AdResult[] = data.images.map((img: any) => ({
            id: img.id,
            headline: t(`ভার্শন ${img.variation_number}`, `Version ${img.variation_number}`),
            body: img.sd_prompt || '',
            cta: '',
            dhoom_score: img.dhoom_score || 70,
            copy_score: 0,
            platform: form.platforms[0] || 'facebook',
            framework: form.framework,
            is_winner: false,
            image_url: img.image_url || '',
          }));
          setResults(imageAds);
          toast.success(t(`${data.images.length}টি ইমেজ তৈরি হয়েছে`, `${data.images.length} images generated`));
        } else {
          toast.error(data?.message || t('ইমেজ তৈরিতে সমস্যা হয়েছে', 'Image generation failed'));
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(t('AI সমস্যা। আবার চেষ্টা করুন।', 'AI error. Please try again.'));
    } finally {
      setGenerating(false);
    }
  }, [activeWorkspace, form, mode, isMobile, t]);

  const handleSwitchToImage = (ad: AdResult) => {
    setMode('image');
    setForm(prev => ({ ...prev, productDesc: `${ad.headline}\n${ad.body}` }));
    if (isMobile) setMobileTab('input');
  };

  const handleRemix = async (options: { learnFromWinners: boolean; framework?: string; tone?: string }) => {
    if (!remixAd?.id || !activeWorkspace) return;
    setRemixing(true);
    try {
      const { data } = await supabase.functions.invoke('remix-ad', {
        body: { workspace_id: activeWorkspace.id, ad_id: remixAd.id, num_variations: 2 },
      });
      if (data?.success && data.ads) {
        setResults(prev => [...data.ads, ...prev]);
        toast.success(t('রিমিক্স তৈরি হয়েছে!', 'Remix created!'));
      }
    } catch {
      toast.error(t('রিমিক্স ব্যর্থ হয়েছে', 'Remix failed'));
    } finally {
      setRemixing(false);
      setRemixAd(null);
    }
  };

  // Desktop layout
  if (!isMobile) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden -m-3 sm:-m-6 md:-m-8">
        <div className="w-[38%] min-w-[340px] border-r border-border">
          <InputPanel
            mode={mode} setMode={setMode}
            form={form} setForm={setForm}
            onGenerate={handleGenerate}
            generating={generating}
          />
        </div>
        <div className="flex-1 bg-secondary">
          <ResultsPanel
            mode={mode}
            results={results}
            setResults={setResults}
            generating={generating}
            onRegenerate={handleGenerate}
            onSwitchToImage={handleSwitchToImage}
            onRemix={ad => setRemixAd(ad)}
          />
        </div>

        <AnimatePresence>
          {remixAd && (
            <RemixModal
              ad={remixAd}
              onClose={() => setRemixAd(null)}
              onRemix={handleRemix}
              remixing={remixing}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Mobile layout
  return (
    <div className="h-[calc(100vh-3.5rem-4rem)] flex flex-col overflow-hidden -m-3 sm:-m-6 md:-m-8">
      <div className="flex bg-card border-b border-border shrink-0">
        {(['input', 'results'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-3 text-sm font-semibold font-heading-bn transition-colors ${
              mobileTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground'
            }`}
          >
            {tab === 'input' ? t('ইনপুট', 'Input') : t('ফলাফল', 'Results')}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {mobileTab === 'input' ? (
          <InputPanel
            mode={mode} setMode={setMode}
            form={form} setForm={setForm}
            onGenerate={handleGenerate}
            generating={generating}
          />
        ) : (
          <ResultsPanel
            mode={mode}
            results={results}
            setResults={setResults}
            generating={generating}
            onRegenerate={handleGenerate}
            onSwitchToImage={handleSwitchToImage}
            onRemix={ad => setRemixAd(ad)}
          />
        )}
      </div>

      <AnimatePresence>
        {remixAd && (
          <RemixModal
            ad={remixAd}
            onClose={() => setRemixAd(null)}
            onRemix={handleRemix}
            remixing={remixing}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdGeneratorPage;
