import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Upload, Check, ArrowRight, Download, Save,
  Loader2, Shirt, AlertTriangle, RefreshCw, ChevronDown,
  Sparkles, User2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import StepIndicator from './StepIndicator';
import PromptEditor from './PromptEditor';
import { buildTryOnPrompt } from './promptBuilders';

type GarmentCategory = 'Top' | 'Bottom' | 'Full Body / Dress' | 'Outerwear' | 'Footwear' | 'Accessory';
type ModelGender = 'female' | 'male';
type ModelBody = 'slim' | 'average' | 'plus';
type ModelSkin = 'fair' | 'light' | 'medium' | 'tan' | 'dark';
type ModelPose = 'standing' | 'walking' | 'sitting' | 'dynamic';
type Background = 'studio_white' | 'studio_grey' | 'lifestyle' | 'transparent';
type LifestyleScene = 'indoor' | 'outdoor' | 'urban' | 'minimal';
type AgeRange = 'teen' | '20s' | '30s' | '40s+';
type ModelStyle = 'natural' | 'editorial' | 'commercial';

const GARMENT_CATEGORIES: { label: string; value: GarmentCategory; icon: string }[] = [
  { label: 'Top', value: 'Top', icon: '👕' },
  { label: 'Bottom', value: 'Bottom', icon: '👖' },
  { label: 'Full Body / Dress', value: 'Full Body / Dress', icon: '👗' },
  { label: 'Outerwear', value: 'Outerwear', icon: '🧥' },
  { label: 'Footwear', value: 'Footwear', icon: '👟' },
  { label: 'Accessory', value: 'Accessory', icon: '👜' },
];

const SKIN_SWATCHES: { value: ModelSkin; label: string; color: string }[] = [
  { value: 'fair', label: 'Fair', color: '#FDEBD0' },
  { value: 'light', label: 'Light', color: '#F5CBA7' },
  { value: 'medium', label: 'Medium', color: '#CA9A6E' },
  { value: 'tan', label: 'Tan', color: '#A0784A' },
  { value: 'dark', label: 'Dark', color: '#6B4226' },
];

const LOADING_MESSAGES = [
  'Creating your model...',
  'Fitting the garment...',
  'Adjusting the drape...',
  'Adding finishing touches...',
];

function getCdnImageUrl(fullUrl: string, opts: { width?: number; quality?: number } = {}): string {
  if (!fullUrl || !fullUrl.includes('/storage/v1/object/public/')) return fullUrl;
  const transformed = fullUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(opts.width));
  if (opts.quality) params.set('quality', String(opts.quality));
  params.set('format', 'webp');
  params.set('resize', 'contain');
  return `${transformed}?${params.toString()}`;
}

const TryOnTab = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();

  // Garment state
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
  const [garmentCategory, setGarmentCategory] = useState<GarmentCategory | null>(null);
  const [garmentReady, setGarmentReady] = useState(false);
  const [showCategoryOverride, setShowCategoryOverride] = useState(false);

  // Model attributes
  const [gender, setGender] = useState<ModelGender>('female');
  const [body, setBody] = useState<ModelBody>('average');
  const [skin, setSkin] = useState<ModelSkin>('medium');
  const [pose, setPose] = useState<ModelPose>('standing');

  // Background
  const [background, setBackground] = useState<Background>('studio_white');
  const [lifestyleScene, setLifestyleScene] = useState<LifestyleScene>('indoor');

  // Options
  const [variations, setVariations] = useState(1);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [ageRange, setAgeRange] = useState<AgeRange>('20s');
  const [modelStyle, setModelStyle] = useState<ModelStyle>('commercial');

  // Two-step flow
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [prompt, setPrompt] = useState('');
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [promptWasEnhanced, setPromptWasEnhanced] = useState(false);

  // Job queue state
  const [jobId, setJobId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completedVariations, setCompletedVariations] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [activeResult, setActiveResult] = useState(0);
  const [partialWarning, setPartialWarning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Model swap state
  const [showSwapPanel, setShowSwapPanel] = useState(false);
  const [swapGender, setSwapGender] = useState<ModelGender>('female');
  const [swapBody, setSwapBody] = useState<ModelBody>('average');
  const [swapSkin, setSwapSkin] = useState<ModelSkin>('medium');
  const [swapPose, setSwapPose] = useState<ModelPose>('standing');
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (msgRef.current) clearInterval(msgRef.current);
    };
  }, []);

  // Realtime job updates
  useEffect(() => {
    if (!jobId) return;
    const channel = supabase
      .channel(`job-${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'studio_jobs', filter: `id=eq.${jobId}`,
      }, (payload: any) => {
        const job = payload.new;
        if (job.completed_variations != null) {
          setCompletedVariations(job.completed_variations);
          setProgress(job.total_variations > 0 ? Math.round((job.completed_variations / job.total_variations) * 100) : 0);
        }
        if (job.status === 'completed') {
          setResults(job.output_urls || []);
          setActiveResult(0);
          setGenerating(false);
          setJobId(null);
          setStep(3);
          toast.success(t('ট্রাই-অন তৈরি হয়েছে', 'Try-on generated'));
        }
        if (job.status === 'failed') {
          setGenerating(false);
          setJobId(null);
          toast.error(job.error_message || t('ত্রুটি হয়েছে', 'An error occurred'));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobId, t]);

  const handleGarmentUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('ফাইল 10MB এর বেশি', 'File exceeds 10MB'));
      return;
    }
    setGarmentFile(file);
    const reader = new FileReader();
    reader.onload = () => setGarmentPreview(reader.result as string);
    reader.readAsDataURL(file);
    setResults([]);
    setPartialWarning(false);
    setGarmentReady(false);
    setGarmentCategory('Top');
    setTimeout(() => setGarmentReady(true), 1500);
    setStep(1);
  }, [t]);

  const canContinue = garmentFile && garmentReady && garmentCategory;

  const handleContinue = () => {
    if (!canContinue) return;
    const bgLabel = background === 'lifestyle' ? `lifestyle_${lifestyleScene}` : background;
    const bgMap: Record<string, string> = {
      studio_white: 'Studio White',
      studio_grey: 'Studio Grey',
      lifestyle: 'Lifestyle',
      transparent: 'Transparent',
    };
    const built = buildTryOnPrompt({
      gender,
      body,
      skin,
      pose,
      age: advancedOpen ? ageRange : undefined,
      style: advancedOpen ? modelStyle : undefined,
      background: bgMap[background] || 'Studio White',
    });
    setDefaultPrompt(built);
    setPrompt(built);
    setPromptWasEnhanced(false);
    setStep(2);
  };

  const handleGenerate = async () => {
    if (!garmentFile || !garmentCategory || !activeWorkspace) return;
    setGenerating(true);
    setLoadingMsgIdx(0);
    setResults([]);
    setProgress(0);
    setCompletedVariations(0);
    setPartialWarning(false);
    setShowSwapPanel(false);

    msgRef.current = setInterval(() => {
      setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 4000);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(garmentFile);
      });

      const { data, error } = await supabase.functions.invoke('queue-studio-job', {
        body: {
          workspace_id: activeWorkspace.id,
          job_type: 'tryon',
          input_config: {
            garment_image_base64: base64,
            garment_category: garmentCategory,
            model_attributes: { gender, body, skin, pose },
            model_prompt: prompt,
            background: background === 'lifestyle' ? `lifestyle_${lifestyleScene}` : background,
            variations,
            advanced: advancedOpen ? { age: ageRange, style: modelStyle } : undefined,
            generation_prompt: prompt,
            prompt_was_enhanced: promptWasEnhanced,
          },
        },
      });

      if (error) {
        const { handleCreditError } = await import('@/utils/creditErrorHandler');
        if (handleCreditError(error, data)) { setGenerating(false); if (msgRef.current) clearInterval(msgRef.current); return; }
        throw error;
      }
      setJobId(data.job_id);

      // Fallback polling
      const POLL_INTERVAL = 2000;
      const MAX_POLL_TIME = 120000;
      const startTime = Date.now();
      pollRef.current = setInterval(async () => {
        if (Date.now() - startTime > MAX_POLL_TIME) {
          if (pollRef.current) clearInterval(pollRef.current);
          if (msgRef.current) clearInterval(msgRef.current);
          setGenerating(false);
          toast.error(t('টাইমআউট হয়েছে', 'Request timed out'));
          return;
        }
        try {
          const { data: status } = await supabase.functions.invoke('get-job-status', {
            body: { job_id: data.job_id },
          });
          if (!status) return;
          setProgress(status.progress || 0);
          setCompletedVariations(status.completed_variations || 0);
          setTimeRemaining(status.time_remaining_ms || 0);
          if (status.status === 'completed') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (msgRef.current) clearInterval(msgRef.current);
            setResults(status.output_urls || []);
            setActiveResult(0);
            setGenerating(false);
            setJobId(null);
            setStep(3);
            if (status.output_urls?.length < variations) setPartialWarning(true);
            toast.success(t('ট্রাই-অন তৈরি হয়েছে', 'Try-on generated'));
          }
          if (status.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (msgRef.current) clearInterval(msgRef.current);
            setGenerating(false);
            setJobId(null);
            toast.error(status.error_message || t('ত্রুটি হয়েছে', 'An error occurred'));
          }
        } catch { /* keep polling */ }
      }, POLL_INTERVAL);
    } catch (err: any) {
      if (msgRef.current) clearInterval(msgRef.current);
      toast.error(err.message || t('ত্রুটি হয়েছে', 'An error occurred'));
      setGenerating(false);
    }
  };

  const handleSwapModel = async () => {
    if (!results[activeResult] || !activeWorkspace) return;
    setSwapping(true);
    try {
      const { data, error } = await supabase.functions.invoke('swap-model', {
        body: {
          workspace_id: activeWorkspace.id,
          source_image_url: results[activeResult],
          new_model_attributes: { gender: swapGender, body: swapBody, skin: swapSkin, pose: swapPose },
          advanced: advancedOpen ? { age: ageRange, style: modelStyle } : undefined,
        },
      });
      if (error) throw error;
      if (data?.image_url) {
        setResults(prev => [...prev, data.image_url]);
        setActiveResult(results.length);
        toast.success(t('মডেল সোয়াপ সম্পন্ন', 'Model swap complete'));
        setShowSwapPanel(false);
      }
    } catch (err: any) {
      toast.error(err.message || t('সোয়াপ ব্যর্থ', 'Swap failed'));
    } finally {
      setSwapping(false);
    }
  };

  const handleMakeAd = () => {
    if (results[activeResult]) {
      navigate(`/dashboard/generate?tab=image&studio_image_url=${encodeURIComponent(results[activeResult])}`);
    }
  };

  const handleDownload = () => {
    const url = results[activeResult];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `tryon_${Date.now()}.png`;
    a.click();
  };

  const handleTryDifferentPose = () => {
    const poses: ModelPose[] = ['standing', 'walking', 'sitting', 'dynamic'];
    const nextPose = poses[(poses.indexOf(pose) + 1) % poses.length];
    setPose(nextPose);
    // Rebuild prompt with new pose and go to step 2
    const bgMap: Record<string, string> = {
      studio_white: 'Studio White', studio_grey: 'Studio Grey',
      lifestyle: 'Lifestyle', transparent: 'Transparent',
    };
    const built = buildTryOnPrompt({
      gender, body, skin, pose: nextPose,
      age: advancedOpen ? ageRange : undefined,
      style: advancedOpen ? modelStyle : undefined,
      background: bgMap[background] || 'Studio White',
    });
    setPrompt(built);
    setDefaultPrompt(built);
    setStep(2);
  };

  // Shared pill selector component
  const PillSelect = ({ label, value, options, onChange }: {
    label: string; value: string;
    options: { label: string; value: string; icon?: React.ReactNode }[];
    onChange: (v: any) => void;
  }) => (
    <div className="space-y-1.5">
      <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5 ${
              value === opt.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            {opt.icon}{opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const SkinSelect = ({ value, onChange, label }: { value: ModelSkin; onChange: (v: ModelSkin) => void; label: string }) => (
    <div className="space-y-1.5">
      <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      <div className="flex gap-2">
        {SKIN_SWATCHES.map(s => (
          <button key={s.value} onClick={() => onChange(s.value)} className="flex flex-col items-center gap-1 group">
            <div
              className={`w-7 h-7 rounded-full transition-all ${value === s.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'ring-1 ring-border group-hover:ring-primary/50'}`}
              style={{ backgroundColor: s.color }}
            />
            <span className={`text-[10px] ${value === s.value ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const modelSummary = `${gender === 'female' ? t('মহিলা', 'Female') : t('পুরুষ', 'Male')} · ${body} · ${skin} · ${pose}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* LEFT PANEL */}
      <div className="lg:col-span-2 space-y-6">
        <StepIndicator
          currentStep={step}
          labels={[t('অপশন', 'Options'), t('প্রম্পট', 'Prompt'), t('ফলাফল', 'Result')]}
        />

        {step === 1 && (
          <>
            {/* SECTION 1: Garment Upload */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">{t('গার্মেন্ট আপলোড', 'Upload Garment')}</h3>
                <p className="text-xs text-muted-foreground">{t('ফ্ল্যাট-লে বা প্রোডাক্ট শট ভালো কাজ করে। ব্যাকগ্রাউন্ড আমরা রিমুভ করব।', 'Flat-lay or product shots work best. We\'ll handle background removal.')}</p>
              </div>

              {!garmentPreview ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-8 cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">{t('গার্মেন্ট ফটো এখানে ড্র্যাগ করুন', 'Drag garment photo here')}</span>
                  <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · Max 10MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleGarmentUpload} />
                </label>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <img src={garmentPreview} alt="Garment" className="h-28 w-28 object-cover rounded-xl border" />
                    <div className="space-y-1">
                      {!garmentReady ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t('ব্যাকগ্রাউন্ড রিমুভ হচ্ছে...', 'Removing background...')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-green-600">
                          <Check className="h-3.5 w-3.5" />
                          {t('প্রস্তুত', 'Ready')}
                        </div>
                      )}
                      <button onClick={() => { setGarmentFile(null); setGarmentPreview(null); setResults([]); setGarmentReady(false); setStep(1); }} className="text-xs text-primary hover:underline">
                        {t('পরিবর্তন', 'Change')}
                      </button>
                    </div>
                  </div>

                  {garmentCategory && !showCategoryOverride && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted border border-border">
                        {GARMENT_CATEGORIES.find(c => c.value === garmentCategory)?.icon} {garmentCategory}
                      </span>
                      <button onClick={() => setShowCategoryOverride(true)} className="text-[11px] text-primary hover:underline">
                        {t('ভুল? পরিবর্তন করুন', 'Wrong? Change')}
                      </button>
                    </div>
                  )}

                  {showCategoryOverride && (
                    <div className="flex flex-wrap gap-1.5">
                      {GARMENT_CATEGORIES.map(cat => (
                        <button key={cat.value}
                          onClick={() => { setGarmentCategory(cat.value); setShowCategoryOverride(false); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            garmentCategory === cat.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-muted-foreground hover:border-primary/50'
                          }`}>
                          {cat.icon} {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 2: Model Attributes */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">{t('মডেল বর্ণনা', 'Describe Your Model')}</h3>
                <p className="text-xs text-muted-foreground">{t('AI আপনার বর্ণনা অনুযায়ী মডেল তৈরি করবে।', 'AI will generate a realistic model matching your description.')}</p>
              </div>

              <PillSelect label={t('লিঙ্গ', 'Gender')} value={gender}
                options={[
                  { label: t('মহিলা', 'Female'), value: 'female', icon: <User2 className="h-3.5 w-3.5" /> },
                  { label: t('পুরুষ', 'Male'), value: 'male', icon: <User2 className="h-3.5 w-3.5" /> },
                ]}
                onChange={setGender} />

              <PillSelect label={t('শরীর', 'Body Type')} value={body}
                options={[
                  { label: t('স্লিম', 'Slim'), value: 'slim' },
                  { label: t('গড়', 'Average'), value: 'average' },
                  { label: t('প্লাস সাইজ', 'Plus Size'), value: 'plus' },
                ]}
                onChange={setBody} />

              <SkinSelect label={t('ত্বকের রং', 'Skin Tone')} value={skin} onChange={setSkin} />

              <PillSelect label={t('পোজ', 'Pose')} value={pose}
                options={[
                  { label: t('দাঁড়ানো', 'Standing'), value: 'standing' },
                  { label: t('হাঁটা', 'Walking'), value: 'walking' },
                  { label: t('বসা', 'Sitting'), value: 'sitting' },
                  { label: t('ডায়নামিক', 'Dynamic'), value: 'dynamic' },
                ]}
                onChange={setPose} />
            </div>

            {/* SECTION 3: Background */}
            <div className="space-y-3">
              <PillSelect label={t('ব্যাকগ্রাউন্ড', 'Background')} value={background}
                options={[
                  { label: t('স্টুডিও হোয়াইট', 'Studio White'), value: 'studio_white' },
                  { label: t('স্টুডিও গ্রে', 'Studio Grey'), value: 'studio_grey' },
                  { label: t('লাইফস্টাইল', 'Lifestyle'), value: 'lifestyle' },
                  { label: t('স্বচ্ছ', 'Transparent'), value: 'transparent' },
                ]}
                onChange={setBackground} />

              {background === 'lifestyle' && (
                <PillSelect label={t('দৃশ্য', 'Scene')} value={lifestyleScene}
                  options={[
                    { label: t('ইনডোর', 'Indoor'), value: 'indoor' },
                    { label: t('আউটডোর', 'Outdoor'), value: 'outdoor' },
                    { label: t('আরবান', 'Urban'), value: 'urban' },
                    { label: t('মিনিমাল', 'Minimal'), value: 'minimal' },
                  ]}
                  onChange={setLifestyleScene} />
              )}
            </div>

            {/* SECTION 4: Options */}
            <div className="space-y-3">
              <PillSelect label={t('ভ্যারিয়েশন', 'Variations')} value={String(variations)}
                options={[{ label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }]}
                onChange={(v) => setVariations(Number(v))} />

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                  {t('অ্যাডভান্সড', 'Advanced')}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <PillSelect label={t('বয়স', 'Age Range')} value={ageRange}
                    options={[
                      { label: t('টিন', 'Teen'), value: 'teen' },
                      { label: '20s', value: '20s' },
                      { label: '30s', value: '30s' },
                      { label: '40s+', value: '40s+' },
                    ]}
                    onChange={setAgeRange} />
                  <PillSelect label={t('স্টাইল', 'Style')} value={modelStyle}
                    options={[
                      { label: t('ন্যাচারাল', 'Natural'), value: 'natural' },
                      { label: t('এডিটোরিয়াল', 'Editorial'), value: 'editorial' },
                      { label: t('কমার্শিয়াল', 'Commercial'), value: 'commercial' },
                    ]}
                    onChange={setModelStyle} />
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Continue Button */}
            <Button onClick={handleContinue} disabled={!canContinue} className="w-full bg-primary hover:bg-primary/90">
              <ArrowRight className="h-4 w-4 mr-2" />
              {t('চালিয়ে যান', 'Continue')}
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">{t('মডেল বর্ণনা', 'Model Description')}</h3>
              <p className="text-xs text-muted-foreground">{t('Fashn.ai যে মডেল তৈরি করবে তার বর্ণনা।', 'This describes the model Fashn.ai will generate.')}</p>
            </div>
            <PromptEditor
              prompt={prompt}
              onPromptChange={(p) => { setPrompt(p); if (p !== defaultPrompt) setPromptWasEnhanced(true); }}
              defaultPrompt={defaultPrompt}
              onBack={() => setStep(1)}
              onGenerate={handleGenerate}
              generating={generating}
              generateLabel={t('ট্রাই-অন তৈরি করুন', 'Generate Try-On')}
              generateIcon={<Shirt className="h-4 w-4 mr-2" />}
            tabType="tryon"
              creditCost={125}
              helperNote={t('এটি আপনার মডেলের বর্ণনা, দৃশ্যের নয়। চেহারায় মনোযোগ দিন — লিঙ্গ, গড়ন, ত্বকের রং, পোজ।', 'This describes your model, not the scene. Focus on appearance — gender, build, skin tone, pose.')}
            />
          </>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('ফলাফল প্রস্তুত! ডানদিকে দেখুন।', 'Result ready! See it on the right.')}</p>
            <Button variant="outline" onClick={() => setStep(2)} className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />{t('প্রম্পট সম্পাদনা ও পুনরায় তৈরি', 'Edit Prompt & Regenerate')}
            </Button>
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-border bg-card min-h-[500px] flex items-center justify-center p-6">
          {generating ? (
            <div className="w-full max-w-sm mx-auto rounded-2xl border border-border bg-card p-6 space-y-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-sm font-medium">{t('ট্রাই-অন তৈরি হচ্ছে...', 'Generating your try-on...')}</p>
              <p className="text-xs text-muted-foreground">{LOADING_MESSAGES[loadingMsgIdx]}</p>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.max(progress, 10)}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{t('ভ্যারিয়েশন', 'Variation')} {completedVariations} {t('এর মধ্যে', 'of')} {variations} {t('সম্পন্ন', 'complete')}</span>
                <span>~{Math.ceil(timeRemaining / 1000)}s {t('বাকি', 'remaining')}</span>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="w-full space-y-4">
              <img src={getCdnImageUrl(results[activeResult], { width: 1200, quality: 90 })} alt="Try-on result" className="w-full max-h-[500px] object-contain rounded-xl" />
              {results.length > 1 && (
                <div className="flex gap-2 justify-center">
                  {results.map((r, i) => (
                    <button key={i} onClick={() => setActiveResult(i)}
                      className={`h-16 w-16 rounded-lg border-2 overflow-hidden ${i === activeResult ? 'border-primary' : 'border-border'}`}>
                      <img src={getCdnImageUrl(r, { width: 240, quality: 85 })} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {partialWarning && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{t(
                    `${results.length}/${variations} ভ্যারিয়েশন সফলভাবে তৈরি হয়েছে। আরো জন্য আবার চেষ্টা করুন।`,
                    `${results.length} of ${variations} variations generated successfully. Try again for more.`
                  )}</span>
                </div>
              )}

              <Button onClick={handleMakeAd} className="w-full bg-primary hover:bg-primary/90">
                <ArrowRight className="h-4 w-4 mr-2" />
                {t('এটি দিয়ে অ্যাড তৈরি করুন', 'Make an Ad with This')}
              </Button>

              <div className="flex gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowSwapPanel(!showSwapPanel);
                  if (!showSwapPanel) {
                    setSwapGender(gender); setSwapBody(body); setSwapSkin(skin); setSwapPose(pose);
                  }
                }}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />{t('মডেল সোয়াপ', 'Swap Model')}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleTryDifferentPose}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />{t('ভিন্ন পোজ', 'Try Different Pose')}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />{t('ডাউনলোড', 'Download')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toast.success(t('লাইব্রেরিতে সেভ হয়েছে', 'Saved to library'))}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />{t('সেভ', 'Save to Library')}
                </Button>
              </div>

              {/* Model Swap Panel */}
              {showSwapPanel && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold">{t('মডেল সোয়াপ করুন — পোশাক রাখুন', 'Swap the model — keep the outfit')}</h4>
                    <p className="text-xs text-muted-foreground">{t('রিজেনারেশন ছাড়াই কে পরছে তা পরিবর্তন করুন।', 'Change who\'s wearing it without regenerating from scratch.')}</p>
                  </div>
                  <PillSelect label={t('লিঙ্গ', 'Gender')} value={swapGender}
                    options={[
                      { label: t('মহিলা', 'Female'), value: 'female', icon: <User2 className="h-3.5 w-3.5" /> },
                      { label: t('পুরুষ', 'Male'), value: 'male', icon: <User2 className="h-3.5 w-3.5" /> },
                    ]}
                    onChange={setSwapGender} />
                  <PillSelect label={t('শরীর', 'Body Type')} value={swapBody}
                    options={[
                      { label: t('স্লিম', 'Slim'), value: 'slim' },
                      { label: t('গড়', 'Average'), value: 'average' },
                      { label: t('প্লাস সাইজ', 'Plus Size'), value: 'plus' },
                    ]}
                    onChange={setSwapBody} />
                  <SkinSelect label={t('ত্বকের রং', 'Skin Tone')} value={swapSkin} onChange={setSwapSkin} />
                  <PillSelect label={t('পোজ', 'Pose')} value={swapPose}
                    options={[
                      { label: t('দাঁড়ানো', 'Standing'), value: 'standing' },
                      { label: t('হাঁটা', 'Walking'), value: 'walking' },
                      { label: t('বসা', 'Sitting'), value: 'sitting' },
                      { label: t('ডায়নামিক', 'Dynamic'), value: 'dynamic' },
                    ]}
                    onChange={setSwapPose} />
                  <Button onClick={handleSwapModel} disabled={swapping} className="w-full bg-primary hover:bg-primary/90">
                    {swapping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    {t('মডেল সোয়াপ করুন', 'Swap Model')}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center space-y-2">
                  {garmentPreview ? (
                    <img src={garmentPreview} alt="Garment" className="h-32 w-32 object-cover rounded-xl border mx-auto" />
                  ) : (
                    <div className="h-32 w-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center mx-auto">
                      <Shirt className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t('আপনার গার্মেন্ট', 'Your garment')}</p>
                </div>
                <ArrowRight className="h-6 w-6 text-muted-foreground/30" />
                <div className="text-center space-y-2">
                  <div className="h-32 w-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center mx-auto gap-1">
                    <User2 className="h-8 w-8 text-muted-foreground/40" />
                    {garmentFile && (
                      <span className="text-[9px] text-muted-foreground text-center px-1 leading-tight">{modelSummary}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('আপনার মডেল', 'Your model')}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{t('ফলাফল এখানে দেখা যাবে', 'Result appears here')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TryOnTab;
