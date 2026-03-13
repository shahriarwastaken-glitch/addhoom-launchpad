import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { FolderOpen, ArrowLeft } from 'lucide-react';
import { trackEvent } from '@/lib/posthog';
import InputPanel from './InputPanel';
import ResultsPanel from './ResultsPanel';
import CopyRemixPanel from './CopyRemixPanel';
import ImageRemixPanel from './ImageRemixPanel';
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
  selectedScenes: ['studio'],
  additionalDetails: '',
  // Copy That! advanced fields
  targetReader: '',
  awarenessStage: 'solution_aware',
  sophistication: 'medium',
  oneIdea: '',
  desires: '',
  notions: '',
  identification: '',
  offer: '',
  oneAction: '',
};

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

  // Project prompt state
  const [showProjectPrompt, setShowProjectPrompt] = useState(true);
  const [projectPromptDismissed, setProjectPromptDismissed] = useState(false);

  const generateBtnRef = useRef<HTMLButtonElement>(null);

  const toggleImageHistory = useCallback(() => {
    setImageHistoryOpen(prev => {
      const next = !prev;
      if (next && isMobile) setMobileTab('results');
      return next;
    });
  }, [isMobile]);

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
      setTimeout(() => {
        generateBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        generateBtnRef.current?.classList.add('animate-pulse');
        setTimeout(() => generateBtnRef.current?.classList.remove('animate-pulse'), 2000);
      }, 500);
    }
  }, [calendarItemId, searchParams]);

  useEffect(() => {
    if (!projectId) { setProjectInfo(null); return; }
    supabase.from('projects').select('name, emoji, color').eq('id', projectId).single()
      .then(({ data }) => { if (data) setProjectInfo(data); });
  }, [projectId]);

  const handleGenerate = useCallback(async (promptsOrSingle?: Record<string, string> | string) => {
    if (!activeWorkspace) {
      toast.error(t('প্রথমে একটি শপ তৈরি করুন', 'Create a shop first'));
      return;
    }
    const productText = mode === 'copy' ? form.productDesc : form.productName;
    if (!productText.trim()) {
      toast.error(mode === 'copy'
        ? t('আপনি কী বিক্রি করছেন তা লিখুন', 'Describe what you are selling')
        : t('পণ্যের নাম দিন', 'Enter product name'));
      return;
    }
    if (mode === 'copy' && form.platforms.length === 0) {
      toast.error(t('কমপক্ষে একটি প্ল্যাটফর্ম নির্বাচন করুন', 'Select at least one platform'));
      return;
    }

    setGenerating(true);
    setResults([]);
    if (isMobile) setMobileTab('results');

    const genStartTime = Date.now();

    try {
      if (mode === 'copy') {
        trackEvent('ad_copy_generation_started', {
          platform: form.platforms[0] || 'facebook',
          language: form.language || lang,
          tone: form.tone,
          variations: form.numVariations,
          used_advanced_options: !!(form.targetReader || form.oneIdea || form.desires),
        });

        const { data, error } = await supabase.functions.invoke('generate-ads', {
          body: {
            workspace_id: activeWorkspace.id,
            product: form.productDesc,
            platform: form.platforms[0] || 'facebook',
            language: form.language || lang,
            tone: form.tone,
            variations: form.numVariations,
            target_reader: form.targetReader || undefined,
            awareness_stage: form.awarenessStage || undefined,
            sophistication: form.sophistication || undefined,
            one_idea: form.oneIdea || undefined,
            desires: form.desires || undefined,
            notions: form.notions || undefined,
            identification: form.identification || undefined,
            offer: form.offer || undefined,
            one_action: form.oneAction || undefined,
            project_id: projectId || undefined,
          },
        });

        if (error) {
          const { handleCreditError } = await import('@/utils/creditErrorHandler');
          if (handleCreditError(error, data)) { setGenerating(false); return; }
          throw error;
        }

        if (data?.success && data.ads) {
          setResults(data.ads);
          trackEvent('ad_copy_generation_completed', {
            variations_returned: data.count,
            platform: form.platforms[0] || 'facebook',
            language: form.language || lang,
          });
          toast.success(t(`${data.count}টি বিজ্ঞাপন তৈরি হয়েছে`, `${data.count} ads generated`));

          if (calendarItemId && data.ads[0]?.id) {
            await supabase.from('content_calendar')
              .update({ status: 'generated', generated_creative_id: data.ads[0].id })
              .eq('id', calendarItemId);
          }
        } else {
          toast.error(data?.message || t('সমস্যা হয়েছে', 'Something went wrong'));
        }
      } else {
        // Image mode — scene-based generation
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

        const finalPrompts = (typeof promptsOrSingle === 'object' && promptsOrSingle !== null)
          ? promptsOrSingle as Record<string, string>
          : {};
        const selectedScenes = form.selectedScenes;

        const { data, error } = await supabase.functions.invoke('generate-ad-image', {
          body: {
            workspace_id: activeWorkspace.id,
            product_name: form.productName,
            selected_scenes: selectedScenes,
            final_prompts: finalPrompts,
            lighting_mood: form.lightingMood,
            camera_angle: form.cameraAngle,
            additional_details: form.additionalDetails,
            product_image_base64,
            product_image_mime_type,
          },
        });

        if (error) {
          const { handleCreditError } = await import('@/utils/creditErrorHandler');
          if (handleCreditError(error, data)) { setGenerating(false); return; }
          throw error;
        }

        if (data?.success && data.images) {
          const imageAds: AdResult[] = data.images.map((img: any) => ({
            id: img.id,
            headline: img.scene ? `${img.scene.charAt(0).toUpperCase() + img.scene.slice(1)}` : 'Generated',
            body: img.prompt || '',
            cta: '',
            dhoom_score: img.dhoom_score || 70,
            copy_score: 0,
            platform: 'facebook',
            framework: '',
            is_winner: false,
            image_url: img.url || img.image_url || '',
            scene: img.scene,
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
      // Check for 402 insufficient credits
      const { handleCreditError } = await import('@/utils/creditErrorHandler');
      if (!handleCreditError(e)) {
        toast.error(t('AI সমস্যা। আবার চেষ্টা করুন।', 'AI error. Please try again.'));
      }
    } finally {
      setGenerating(false);
    }
  }, [activeWorkspace, form, mode, isMobile, t, calendarItemId, projectId, lang]);

  const handleHandoffToImage = useCallback(() => {
    if (results.length === 0) return;
    const best = [...results].sort((a, b) => b.dhoom_score - a.dhoom_score)[0];
    const ctx: SelectedCopyContext = {
      headline: best.headline, body: best.body, cta: best.cta,
      framework: best.framework, platform: best.platform, dhoom_score: best.dhoom_score,
    };
    setSelectedCopy(ctx);
    setMode('image');
    setForm(prev => ({ ...prev, productDesc: `${best.headline}\n${best.body}`, platforms: [best.platform] }));
    setResults([]);
    if (isMobile) setMobileTab('input');
  }, [results, isMobile]);

  const handleSwitchToImage = (ad: AdResult) => {
    const ctx: SelectedCopyContext = {
      headline: ad.headline, body: ad.body, cta: ad.cta,
      framework: ad.framework, platform: ad.platform, dhoom_score: ad.dhoom_score,
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

  const handleSchedule = (ad: AdResult) => {
    setScheduleModal({
      creativeId: ad.image_url ? undefined : ad.id,
      imageId: ad.image_url ? ad.id : undefined,
      platform: ad.platform,
      productName: form.productName || ad.headline,
    });
  };

  // New remix handler — opens the appropriate panel
  const handleRemixClick = (ad: AdResult) => {
    setRemixAd(ad);
  };

  const handleCopyRemixComplete = (ads: AdResult[]) => {
    setResults(prev => [...ads, ...prev]);
    setRemixAd(null);
  };

  const handleImageRemixComplete = (images: any[]) => {
    const newAds: AdResult[] = images.map((img: any, i: number) => ({
      id: img.id,
      headline: t(`রিমিক্স ভার্শন ${i + 1}`, `Remix Version ${i + 1}`),
      body: '',
      cta: '',
      dhoom_score: img.dhoom_score || 70,
      copy_score: 0,
      platform: remixAd?.platform || 'facebook',
      framework: remixAd?.framework || 'FOMO',
      is_winner: false,
      image_url: img.image_url || '',
    }));
    setResults(prev => [...newAds, ...prev]);
  };

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

  // Determine which remix panel to show
  const remixPanel = remixAd ? (
    remixAd.image_url ? (
      <ImageRemixPanel
        image={{
          id: remixAd.id || '',
          image_url: remixAd.image_url,
          product_name: form.productName || remixAd.headline,
          style: form.imageStyle,
          text_config: {},
        }}
        workspaceId={activeWorkspace?.id || ''}
        onClose={() => setRemixAd(null)}
        onRemixComplete={handleImageRemixComplete}
      />
    ) : (
      <CopyRemixPanel
        ad={remixAd}
        workspaceId={activeWorkspace?.id || ''}
        onClose={() => setRemixAd(null)}
        onRemixComplete={handleCopyRemixComplete}
      />
    )
  ) : null;

  const resultsPanel = (
    <ResultsPanel
      mode={mode}
      results={results}
      setResults={setResults}
      generating={generating}
      onRegenerate={handleGenerate}
      onSwitchToImage={handleSwitchToImage}
      onRemix={handleRemixClick}
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
          {calendarItemId && (
            <div className="px-6 pt-3 pb-0">
              <button onClick={() => navigate('/dashboard/calendar')}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-heading-bn">
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
              mode={mode} hasResults={results.length > 0}
              isScheduled={isScheduled} hasImage={hasImageResult}
              onCreateImage={handleHandoffToImage}
            />
          )}
        </div>

        <AnimatePresence>{remixPanel}</AnimatePresence>

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
          <button onClick={() => navigate('/dashboard/calendar')}
            className="flex items-center gap-1 px-3 text-xs text-primary font-heading-bn">
            <ArrowLeft size={12} />
          </button>
        )}
        {(['input', 'results'] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className={`flex-1 py-3 text-sm font-semibold font-heading-bn transition-colors ${
              mobileTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}>
            {tab === 'input' ? t('ইনপুট', 'Input') : t('ফলাফল', 'Results')}
          </button>
        ))}
      </div>

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
          ) : resultsPanel}
        </div>
        {mobileTab === 'results' && results.length > 0 && !generating && (
          <HandoffBar
            mode={mode} hasResults={results.length > 0}
            isScheduled={isScheduled} hasImage={hasImageResult}
            onCreateImage={handleHandoffToImage}
          />
        )}
      </div>

      <AnimatePresence>{remixPanel}</AnimatePresence>

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
