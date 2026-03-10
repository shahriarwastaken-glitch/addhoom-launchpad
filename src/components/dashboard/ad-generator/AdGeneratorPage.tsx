import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { FolderOpen, ArrowLeft } from 'lucide-react';
import InputPanel from './InputPanel';
import ResultsPanel from './ResultsPanel';
import RemixModal from './RemixModal';
import HandoffBar from './HandoffBar';
import ScheduleModal from './ScheduleModal';
import type { GeneratorMode, GeneratorFormData, AdResult } from './types';

const IMAGE_HISTORY_KEY = 'dhoom_image_history';
const MAX_HISTORY = 3;

export interface ImageHistoryEntry {
  id: string;
  timestamp: number;
  productName: string;
  results: AdResult[];
}

export const getImageHistory = (): ImageHistoryEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(IMAGE_HISTORY_KEY) || '[]');
  } catch { return []; }
};

const saveImageHistory = (productName: string, results: AdResult[]) => {
  const history = getImageHistory();
  history.unshift({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    productName,
    results,
  });
  localStorage.setItem(IMAGE_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
};

const defaultForm: GeneratorFormData = {
  productName: '',
  productDesc: '',
  price: '',
  platforms: ['facebook'],
  language: 'en',
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
  lightingMood: 'soft',
  colorMood: 'neutral',
  cameraAngle: 'front',
  backgroundComplexity: 'minimal',
  timeOfDay: 'golden',
  productFocus: 'hero',
};

// Selected copy context for handoff
export interface SelectedCopyContext {
  headline: string;
  body: string;
  cta: string;
  framework: string;
  platform: string;
  dhoom_score: number;
}

const AdGeneratorPage = () => {
  const { activeWorkspace } = useAuth();
  const { t, lang } = useLanguage();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project_id');
  const calendarItemId = searchParams.get('calendar_item_id');

  const [mode, setMode] = useState<GeneratorMode>('copy');
  const [form, setForm] = useState<GeneratorFormData>(defaultForm);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<AdResult[]>([]);
  const [remixAd, setRemixAd] = useState<AdResult | null>(null);
  const [remixing, setRemixing] = useState(false);
  const [mobileTab, setMobileTab] = useState<'input' | 'results'>('input');
  const [projectInfo, setProjectInfo] = useState<{ name: string; emoji: string; color: string } | null>(null);
  const [imageHistoryOpen, setImageHistoryOpen] = useState(false);

  // Handoff state
  const [selectedCopy, setSelectedCopy] = useState<SelectedCopyContext | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [hasImageResult, setHasImageResult] = useState(false);
  const [scheduleModal, setScheduleModal] = useState<{
    creativeId?: string;
    imageId?: string;
    platform: string;
    productName?: string;
  } | null>(null);

  // Project prompt state (Connection 5)
  const [showProjectPrompt, setShowProjectPrompt] = useState(true);
  const [projectPromptDismissed, setProjectPromptDismissed] = useState(false);

  // Generate button ref for pulse
  const generateBtnRef = useRef<HTMLButtonElement>(null);

  const toggleImageHistory = useCallback(() => {
    setImageHistoryOpen(prev => {
      const next = !prev;
      if (next && isMobile) {
        setMobileTab('results');
      }
      return next;
    });
  }, [isMobile]);

  // CONNECTION 3: Read URL params from calendar
  useEffect(() => {
    const product = searchParams.get('product');
    const platform = searchParams.get('platform');
    const occasion = searchParams.get('occasion');
    const framework = searchParams.get('framework');
    const tone = searchParams.get('tone');

    if (calendarItemId || product) {
      setForm(prev => ({
        ...prev,
        productName: product || prev.productName,
        platforms: platform ? [platform] : prev.platforms,
        occasion: occasion || prev.occasion,
        framework: framework || prev.framework,
        tone: tone || prev.tone,
      }));

      // Pulse the generate button after delay
      setTimeout(() => {
        generateBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        generateBtnRef.current?.classList.add('animate-pulse');
        setTimeout(() => generateBtnRef.current?.classList.remove('animate-pulse'), 2000);
      }, 500);
    }
  }, [calendarItemId, searchParams]);

  // Fetch project info if project_id is present
  useEffect(() => {
    if (!projectId) { setProjectInfo(null); return; }
    supabase.from('projects').select('name, emoji, color').eq('id', projectId).single()
      .then(({ data }) => { if (data) setProjectInfo(data); });
  }, [projectId]);

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
            language: lang,
            framework: form.framework,
            occasion: form.occasion,
            tone: form.tone,
            num_variations: form.numVariations,
            project_id: projectId || undefined,
          },
        });

        if (error) throw error;

        if (data?.success && data.ads) {
          setResults(data.ads);
          toast.success(t(`${data.count}টি বিজ্ঞাপন তৈরি হয়েছে`, `${data.count} ads generated`));

          // CONNECTION 3: Auto-save back to calendar
          if (calendarItemId && data.ads[0]?.id) {
            await supabase.from('content_calendar')
              .update({ status: 'generated', generated_creative_id: data.ads[0].id })
              .eq('id', calendarItemId);
          }
        } else {
          toast.error(data?.message || t('সমস্যা হয়েছে', 'Something went wrong'));
        }
      } else {
        // Convert product image to base64 if present
        let product_image_base64: string | undefined;
        let product_image_mime_type = "image/jpeg";
        if (form.productImagePreview) {
          product_image_base64 = form.productImagePreview;
          const mimeMatch = form.productImagePreview.match(/^data:(image\/\w+);base64,/);
          if (mimeMatch) product_image_mime_type = mimeMatch[1];
        }

        if (!product_image_base64) {
          toast.error(t('পণ্যের ছবি আপলোড করুন', 'Upload a product image'));
          setGenerating(false);
          return;
        }

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
            language: lang,
            num_variations: form.numVariations,
            product_image_base64,
            product_image_mime_type,
            framework: form.framework,
            occasion: form.occasion,
            tone: form.tone,
            platforms: form.platforms,
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
          setHasImageResult(true);
          saveImageHistory(form.productName, imageAds);
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
  }, [activeWorkspace, form, mode, isMobile, t, calendarItemId, projectId, lang]);

  // CONNECTION 1: Best-scored copy → Image handoff
  const handleHandoffToImage = useCallback(() => {
    if (results.length === 0) return;
    // Pick best-scored
    const best = [...results].sort((a, b) => b.dhoom_score - a.dhoom_score)[0];
    const ctx: SelectedCopyContext = {
      headline: best.headline,
      body: best.body,
      cta: best.cta,
      framework: best.framework,
      platform: best.platform,
      dhoom_score: best.dhoom_score,
    };
    setSelectedCopy(ctx);
    setMode('image');
    setForm(prev => ({
      ...prev,
      productDesc: `${best.headline}\n${best.body}`,
      platforms: [best.platform],
    }));
    setResults([]);
    if (isMobile) setMobileTab('input');
  }, [results, isMobile]);

  const handleSwitchToImage = (ad: AdResult) => {
    const ctx: SelectedCopyContext = {
      headline: ad.headline,
      body: ad.body,
      cta: ad.cta,
      framework: ad.framework,
      platform: ad.platform,
      dhoom_score: ad.dhoom_score,
    };
    setSelectedCopy(ctx);
    setMode('image');
    setForm(prev => ({ ...prev, productDesc: `${ad.headline}\n${ad.body}` }));
    if (isMobile) setMobileTab('input');
  };

  const clearCopyContext = () => {
    setSelectedCopy(null);
    setForm(prev => ({ ...prev, productDesc: '' }));
  };

  // CONNECTION 2 & 4: Schedule handler
  const handleSchedule = (ad: AdResult) => {
    setScheduleModal({
      creativeId: ad.image_url ? undefined : ad.id,
      imageId: ad.image_url ? ad.id : undefined,
      platform: ad.platform,
      productName: form.productName || ad.headline,
    });
  };

  const handleRemix = async (options: { learnFromWinners: boolean; framework?: string; tone?: string }) => {
    if (!remixAd?.id || !activeWorkspace) return;
    setRemixing(true);
    try {
      if (remixAd.image_url) {
        const { data } = await supabase.functions.invoke('remix-image-ad', {
          body: {
            workspace_id: activeWorkspace.id,
            ad_image_id: remixAd.id,
          },
        });
        if (data?.success && data.images) {
          const newAds: AdResult[] = data.images.map((img: any) => ({
            id: img.id,
            headline: t(`রিমিক্স ভার্শন`, `Remix Version`),
            body: img.sd_prompt || '',
            cta: '',
            dhoom_score: img.dhoom_score || 70,
            copy_score: 0,
            platform: remixAd.platform,
            framework: remixAd.framework,
            is_winner: false,
            image_url: img.image_url || '',
          }));
          setResults(prev => [...newAds, ...prev]);
          toast.success(t('ইমেজ রিমিক্স তৈরি হয়েছে!', 'Image remix created!'));
        } else {
          toast.error(data?.message || t('রিমিক্স ব্যর্থ হয়েছে', 'Remix failed'));
        }
      } else {
        const { data } = await supabase.functions.invoke('remix-ad', {
          body: { workspace_id: activeWorkspace.id, ad_id: remixAd.id, num_variations: 2 },
        });
        if (data?.success && data.ads) {
          setResults(prev => [...data.ads, ...prev]);
          toast.success(t('রিমিক্স তৈরি হয়েছে!', 'Remix created!'));
        }
      }
    } catch {
      toast.error(t('রিমিক্স ব্যর্থ হয়েছে', 'Remix failed'));
    } finally {
      setRemixing(false);
      setRemixAd(null);
    }
  };

  // CONNECTION 5: Assign all results to a project
  const handleAssignAllToProject = async (projectIdToAssign: string, projectName: string) => {
    const copyIds = results.filter(r => r.id && !r.image_url).map(r => r.id!);
    if (copyIds.length === 0) return;

    const promises = copyIds.map(id =>
      supabase.from('ad_creatives').update({ project_id: projectIdToAssign }).eq('id', id)
    );
    await Promise.all(promises);
    toast.success(t(
      `✓ ${copyIds.length}টি বিজ্ঞাপন "${projectName}" প্রজেক্টে যোগ হয়েছে`,
      `✓ ${copyIds.length} ads added to "${projectName}"`
    ));
    setShowProjectPrompt(false);
  };

  const resultsPanel = (
    <ResultsPanel
      mode={mode}
      results={results}
      setResults={setResults}
      generating={generating}
      onRegenerate={handleGenerate}
      onSwitchToImage={handleSwitchToImage}
      onRemix={ad => setRemixAd(ad)}
      onLoadHistory={setResults}
      projectId={projectId}
      imageHistoryOpen={imageHistoryOpen}
      onToggleImageHistory={toggleImageHistory}
      onSchedule={handleSchedule}
      showProjectPrompt={!projectId && !projectPromptDismissed && showProjectPrompt && results.length > 0 && !results[0]?.image_url}
      onAssignAllToProject={handleAssignAllToProject}
      onDismissProjectPrompt={() => setProjectPromptDismissed(true)}
    />
  );

  // Desktop layout
  if (!isMobile) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden -m-3 sm:-m-6 md:-m-8">
        <div className="w-[38%] min-w-[340px] border-r border-border flex flex-col">
          {/* Calendar context breadcrumb (Connection 3) */}
          {calendarItemId && (
            <div className="px-6 pt-3 pb-0">
              <button
                onClick={() => navigate('/dashboard/calendar')}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-heading-bn"
              >
                <ArrowLeft size={12} /> {t('ক্যালেন্ডারে ফিরুন', 'Back to Calendar')}
              </button>
            </div>
          )}
          {projectInfo && (
            <div className="px-6 pt-4 pb-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-l-[3px]"
                style={{ borderColor: projectInfo.color, background: `${projectInfo.color}12` }}>
                <FolderOpen size={14} style={{ color: projectInfo.color }} />
                <div>
                  <span className="text-sm font-semibold text-foreground">{projectInfo.emoji} {projectInfo.name}</span>
                  <p className="text-[11px] text-muted-foreground">{t('এই প্রজেক্টে সংরক্ষণ হবে', 'Will save to this project')}</p>
                </div>
              </div>
            </div>
          )}
          {/* Copy context chip (Connection 1) */}
          {selectedCopy && mode === 'image' && (
            <div className="px-6 pt-3 pb-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/[0.06] border border-primary/15">
                <span className="text-xs text-primary font-heading-bn truncate flex-1">
                  ✍️ {t('কপি থেকে:', 'From copy:')} "{selectedCopy.headline.slice(0, 30)}{selectedCopy.headline.length > 30 ? '...' : ''}"
                </span>
                <button onClick={clearCopyContext} className="text-primary/60 hover:text-primary text-xs">×</button>
              </div>
            </div>
          )}
          <div className="flex-1 min-h-0">
            <InputPanel
              mode={mode} setMode={setMode}
              form={form} setForm={setForm}
              onGenerate={handleGenerate}
              generating={generating}
              onToggleImageHistory={toggleImageHistory}
              generateBtnRef={generateBtnRef}
            />
          </div>
        </div>
        <div className="flex-1 bg-secondary flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            {resultsPanel}
          </div>
          {results.length > 0 && !generating && (
            <HandoffBar
              mode={mode}
              hasResults={results.length > 0}
              isScheduled={isScheduled}
              hasImage={hasImageResult}
              onCreateImage={handleHandoffToImage}
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

        <AnimatePresence>
          {scheduleModal && (
            <ScheduleModal
              {...scheduleModal}
              onClose={() => setScheduleModal(null)}
              onScheduled={() => setIsScheduled(true)}
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
        {calendarItemId && (
          <button
            onClick={() => navigate('/dashboard/calendar')}
            className="flex items-center gap-1 px-3 text-xs text-primary font-heading-bn"
          >
            <ArrowLeft size={12} />
          </button>
        )}
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

      {/* Copy context chip (mobile) */}
      {selectedCopy && mode === 'image' && mobileTab === 'input' && (
        <div className="px-4 pt-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/[0.06] border border-primary/15">
            <span className="text-xs text-primary font-heading-bn truncate flex-1">
              ✍️ {t('কপি থেকে:', 'From copy:')} "{selectedCopy.headline.slice(0, 25)}..."
            </span>
            <button onClick={clearCopyContext} className="text-primary/60 hover:text-primary text-xs">×</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0">
          {mobileTab === 'input' ? (
            <InputPanel
              mode={mode} setMode={setMode}
              form={form} setForm={setForm}
              onGenerate={handleGenerate}
              generating={generating}
              onToggleImageHistory={toggleImageHistory}
              generateBtnRef={generateBtnRef}
            />
          ) : (
            resultsPanel
          )}
        </div>
        {mobileTab === 'results' && results.length > 0 && !generating && (
          <HandoffBar
            mode={mode}
            hasResults={results.length > 0}
            isScheduled={isScheduled}
            hasImage={hasImageResult}
            onCreateImage={handleHandoffToImage}
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

      <AnimatePresence>
        {scheduleModal && (
          <ScheduleModal
            {...scheduleModal}
            onClose={() => setScheduleModal(null)}
            onScheduled={() => setIsScheduled(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdGeneratorPage;
