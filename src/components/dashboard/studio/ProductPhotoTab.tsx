import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Upload, Camera, ArrowRight, Download, RotateCcw, Save,
  Loader2, Square, Lightbulb, Home, Layout, Trees, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SceneType, SceneConfig, ImageFormat, ExportFormat } from './types';
import StepIndicator from './StepIndicator';
import PromptEditor from './PromptEditor';
import { buildProductPhotoPrompt } from './promptBuilders';
import type { LightingMood, ColorMood, CameraAngle, BackgroundComplexity, TimeOfDay, ProductFocus } from '@/components/dashboard/ad-generator/types';
import {
  LIGHTING_OPTIONS, COLOR_MOOD_OPTIONS, CAMERA_ANGLE_OPTIONS,
  BACKGROUND_OPTIONS, TIME_OF_DAY_OPTIONS, PRODUCT_FOCUS_OPTIONS,
  SCENE_STYLE_DEFAULTS,
} from '@/components/dashboard/ad-generator/types';

interface SceneOption {
  key: SceneType;
  icon: React.ElementType;
  labelEn: string;
  labelBn: string;
  descEn: string;
  descBn: string;
}

const SCENES: SceneOption[] = [
  { key: 'onWhite', icon: Square, labelEn: 'On White', labelBn: 'সাদায়', descEn: 'Clean white background. Perfect for marketplaces like Daraz.', descBn: 'পরিষ্কার সাদা ব্যাকগ্রাউন্ড। Daraz এর জন্য উপযুক্ত।' },
  { key: 'studio', icon: Lightbulb, labelEn: 'Studio', labelBn: 'স্টুডিও', descEn: 'Seamless backdrop, professional softbox lighting, soft shadows.', descBn: 'সীমলেস ব্যাকড্রপ, প্রফেশনাল সফটবক্স লাইটিং।' },
  { key: 'lifestyle', icon: Home, labelEn: 'Lifestyle', labelBn: 'লাইফস্টাইল', descEn: 'Product in a real environment. Natural light, props, context.', descBn: 'বাস্তব পরিবেশে পণ্য। প্রাকৃতিক আলো, প্রপস।' },
  { key: 'flatlay', icon: Layout, labelEn: 'Flat Lay', labelBn: 'ফ্ল্যাট লে', descEn: 'Overhead shot on a styled surface with props.', descBn: 'স্টাইল করা সারফেসে ওভারহেড শট।' },
  { key: 'outdoor', icon: Trees, labelEn: 'Outdoor', labelBn: 'আউটডোর', descEn: 'Natural environment, golden hour light.', descBn: 'প্রাকৃতিক পরিবেশ, গোল্ডেন আওয়ার আলো।' },
];

const LOADING_MESSAGES = [
  'Setting up the scene...',
  'Placing your product...',
  'Adjusting the lighting...',
  'Adding the finishing touches...',
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

// Reusable pill selector for visual controls
const VisualPillGroup = ({
  label, options, value, onChange, t,
}: {
  label: string;
  options: { label: string; labelEn: string; value: string; emoji: string }[];
  value: string;
  onChange: (v: string) => void;
  t: (bn: string, en: string) => string;
}) => (
  <div className="space-y-1.5">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={`h-9 px-3.5 rounded-full text-xs font-medium border transition-all ${
            value === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'
          }`}>
          <span className="mr-1">{opt.emoji}</span>{t(opt.label, opt.labelEn)}
        </button>
      ))}
    </div>
  </div>
);

const ProductPhotoTab = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeWorkspace } = useAuth();

  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [scene, setScene] = useState<SceneType | null>(null);
  const [sceneConfig, setSceneConfig] = useState<SceneConfig>({});
  const [format, setFormat] = useState<ImageFormat>('1:1');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [transparentBg, setTransparentBg] = useState(false);

  // 6 visual controls
  const [lightingMood, setLightingMood] = useState<LightingMood>('soft');
  const [colorMood, setColorMood] = useState<ColorMood>('neutral');
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('front');
  const [backgroundComplexity, setBackgroundComplexity] = useState<BackgroundComplexity>('minimal');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('golden');
  const [productFocus, setProductFocus] = useState<ProductFocus>('hero');

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
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (msgRef.current) clearInterval(msgRef.current);
    };
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!jobId) return;
    const channel = supabase
      .channel(`job-${jobId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'studio_jobs', filter: `id=eq.${jobId}` },
        (payload: any) => {
          const job = payload.new;
          if (job.status === 'completed') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (msgRef.current) clearInterval(msgRef.current);
            setResultUrl(job.output_urls?.[0] || null);
            setGenerating(false);
            setJobId(null);
            setStep(3);
            toast.success(t('ফটো তৈরি হয়েছে', 'Photo generated'));
          }
          if (job.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (msgRef.current) clearInterval(msgRef.current);
            setGenerating(false);
            setJobId(null);
            toast.error(job.error_message || t('ত্রুটি হয়েছে', 'An error occurred'));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobId, t]);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('ফাইল 10MB এর বেশি', 'File exceeds 10MB'));
      return;
    }
    setProductFile(file);
    const reader = new FileReader();
    reader.onload = () => setProductPreview(reader.result as string);
    reader.readAsDataURL(file);
    setResultUrl(null);
    setStep(1);
  }, [t]);

  // Apply smart defaults when scene changes
  const handleSceneChange = (newScene: SceneType) => {
    setScene(newScene);
    setSceneConfig({});
    const defaults = SCENE_STYLE_DEFAULTS[newScene];
    if (defaults) {
      setLightingMood(defaults.lightingMood);
      setColorMood(defaults.colorMood);
      setCameraAngle(defaults.cameraAngle);
      setBackgroundComplexity(defaults.backgroundComplexity);
      setTimeOfDay(defaults.timeOfDay);
      setProductFocus(defaults.productFocus);
      const sceneNames = SCENES.find(s => s.key === newScene);
      toast.success(t(`${sceneNames?.labelBn || newScene} সিনের জন্য ডিফল্ট আপডেট হয়েছে`, `Defaults updated for ${sceneNames?.labelEn || newScene} scene`), { duration: 2000 });
    }
  };

  const canContinue = productFile && scene;

  const handleContinue = () => {
    if (!canContinue) return;
    const built = buildProductPhotoPrompt({
      productName: '',
      scene: scene!,
      sceneConfig: sceneConfig as Record<string, string>,
      format,
      lightingMood,
      colorMood,
      cameraAngle,
      backgroundComplexity,
      timeOfDay,
      productFocus,
    });
    setDefaultPrompt(built);
    setPrompt(built);
    setPromptWasEnhanced(false);
    setStep(2);
  };

  const handleGenerate = async () => {
    if (!productFile || !scene || !activeWorkspace) return;
    setGenerating(true);
    setLoadingMsgIdx(0);
    setResultUrl(null);
    setProgress(0);

    msgRef.current = setInterval(() => {
      setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 4000);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(productFile);
      });

      const { data, error } = await supabase.functions.invoke('queue-studio-job', {
        body: {
          workspace_id: activeWorkspace.id,
          job_type: 'product_photo',
          input_config: {
            product_image_base64: base64,
            scene,
            scene_config: sceneConfig,
            format,
            export_format: exportFormat,
            transparent_bg: transparentBg,
            generation_prompt: prompt,
            prompt_was_enhanced: promptWasEnhanced,
          },
        },
      });

      if (error) throw error;
      setJobId(data.job_id);

      // Fallback polling
      const startTime = Date.now();
      pollRef.current = setInterval(async () => {
        if (Date.now() - startTime > 120000) {
          if (pollRef.current) clearInterval(pollRef.current);
          if (msgRef.current) clearInterval(msgRef.current);
          setGenerating(false);
          toast.error(t('টাইমআউট হয়েছে', 'Request timed out'));
          return;
        }
        try {
          const { data: status } = await supabase.functions.invoke('get-job-status', { body: { job_id: data.job_id } });
          if (!status) return;
          setProgress(status.progress || 0);
          setTimeRemaining(status.time_remaining_ms || 0);
          if (status.status === 'completed') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (msgRef.current) clearInterval(msgRef.current);
            setResultUrl(status.output_urls?.[0] || null);
            setGenerating(false);
            setJobId(null);
            setStep(3);
            toast.success(t('ফটো তৈরি হয়েছে', 'Photo generated'));
          }
          if (status.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (msgRef.current) clearInterval(msgRef.current);
            setGenerating(false);
            setJobId(null);
            toast.error(status.error_message || t('ত্রুটি হয়েছে', 'An error occurred'));
          }
        } catch { /* keep polling */ }
      }, 2000);
    } catch (err: any) {
      if (msgRef.current) clearInterval(msgRef.current);
      toast.error(err.message || t('ত্রুটি হয়েছে', 'An error occurred'));
      setGenerating(false);
    }
  };

  const updateConfig = (key: keyof SceneConfig, value: string) => {
    setSceneConfig(prev => ({ ...prev, [key]: value }));
  };

  const PillSelect = ({ label, value, options, onChange }: {
    label: string; value: string | undefined;
    options: { label: string; value: string }[];
    onChange: (v: string) => void;
  }) => (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              value === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'
            }`}>{opt.label}</button>
        ))}
      </div>
    </div>
  );

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
            {/* Product Upload */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">{t('পণ্য আপলোড', 'Upload Product')}</h3>
                <p className="text-xs text-muted-foreground">{t('যেকোনো পণ্যের ফটো। আমরা প্রফেশনাল সিনে রাখব।', 'Any product photo. We\'ll place it in a professional scene.')}</p>
              </div>
              {!productPreview ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-8 cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">{t('পণ্যের ফটো এখানে ড্র্যাগ করুন', 'Drag product photo here')}</span>
                  <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · Max 10MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
              ) : (
                <div className="flex items-center gap-3">
                  <img src={productPreview} alt="Product" className="h-28 w-28 object-cover rounded-xl border" />
                  <button onClick={() => { setProductFile(null); setProductPreview(null); setResultUrl(null); }} className="text-xs text-primary hover:underline">
                    {t('পরিবর্তন', 'Change')}
                  </button>
                </div>
              )}
            </div>

            {/* Scene Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{t('সিন বাছাই', 'Choose Scene')}</h3>
              <div className="grid grid-cols-2 gap-2">
                {SCENES.map(s => (
                  <button key={s.key} onClick={() => handleSceneChange(s.key)}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      scene === s.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}>
                    <s.icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t(s.labelBn, s.labelEn)}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{t(s.descBn, s.descEn)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scene Details */}
            {scene && (
              <div className="space-y-3 animate-in slide-in-from-top-2">
                {scene === 'onWhite' && (
                  <PillSelect label={t('ছায়া', 'Shadow')} value={sceneConfig.shadow || 'soft'}
                    options={[{ label: t('নরম ছায়া', 'Soft Shadow'), value: 'soft' }, { label: t('ছায়া নেই', 'No Shadow'), value: 'none' }]}
                    onChange={v => updateConfig('shadow', v)} />
                )}
                {scene === 'studio' && (
                  <>
                    <PillSelect label={t('ব্যাকড্রপ', 'Backdrop')} value={sceneConfig.backdrop || 'white'}
                      options={[{ label: 'White', value: 'white' }, { label: 'Light Grey', value: 'light grey' }, { label: 'Black', value: 'black' }, { label: 'Warm Beige', value: 'warm beige' }]}
                      onChange={v => updateConfig('backdrop', v)} />
                    <PillSelect label={t('লাইটিং ডিরেকশন', 'Lighting Direction')} value={sceneConfig.lightingDirection || 'left'}
                      options={[{ label: t('বাম', 'Left'), value: 'left' }, { label: t('ডান', 'Right'), value: 'right' }, { label: t('উপর', 'Top'), value: 'top' }]}
                      onChange={v => updateConfig('lightingDirection', v as any)} />
                  </>
                )}
                {scene === 'lifestyle' && (
                  <>
                    <PillSelect label={t('সারফেস', 'Surface')} value={sceneConfig.surface || 'marble'}
                      options={[{ label: 'Marble', value: 'marble' }, { label: 'Wood', value: 'wood' }, { label: 'Fabric', value: 'fabric' }, { label: 'Concrete', value: 'concrete' }]}
                      onChange={v => updateConfig('surface', v)} />
                    <PillSelect label={t('মুড', 'Mood')} value={sceneConfig.mood || 'warm'}
                      options={[{ label: t('উষ্ণ', 'Warm'), value: 'warm' }, { label: t('ঠান্ডা', 'Cool'), value: 'cool' }, { label: t('নিরপেক্ষ', 'Neutral'), value: 'neutral' }]}
                      onChange={v => updateConfig('mood', v as any)} />
                  </>
                )}
                {scene === 'flatlay' && (
                  <>
                    <PillSelect label={t('সারফেস', 'Surface')} value={sceneConfig.surface || 'marble'}
                      options={[{ label: 'Marble', value: 'marble' }, { label: 'Linen', value: 'linen' }, { label: 'Dark Wood', value: 'dark wood' }, { label: 'Pastel', value: 'pastel' }]}
                      onChange={v => updateConfig('surface', v)} />
                    <PillSelect label={t('প্রপস', 'Props')} value={sceneConfig.propsDensity || 'minimal'}
                      options={[{ label: t('ন্যূনতম', 'Minimal'), value: 'minimal' }, { label: t('মাঝারি', 'Moderate'), value: 'moderate' }, { label: t('সমৃদ্ধ', 'Rich'), value: 'rich' }]}
                      onChange={v => updateConfig('propsDensity', v as any)} />
                  </>
                )}
                {scene === 'outdoor' && (
                  <>
                    <PillSelect label={t('সময়', 'Time')} value={sceneConfig.timeOfDay || 'golden'}
                      options={[{ label: t('সকাল', 'Morning'), value: 'morning' }, { label: t('গোল্ডেন আওয়ার', 'Golden Hour'), value: 'golden' }, { label: t('মেঘলা', 'Overcast'), value: 'overcast' }]}
                      onChange={v => updateConfig('timeOfDay', v as any)} />
                    <PillSelect label={t('পরিবেশ', 'Environment')} value={sceneConfig.environment || 'garden'}
                      options={[{ label: t('বাগান', 'Garden'), value: 'garden' }, { label: t('শহুরে', 'Urban'), value: 'urban' }, { label: t('সমুদ্র', 'Beach'), value: 'beach' }, { label: t('বন', 'Forest'), value: 'forest' }]}
                      onChange={v => updateConfig('environment', v as any)} />
                  </>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[12px] uppercase tracking-wider text-muted-foreground">{t('ভিজ্যুয়াল কন্ট্রোল', 'Visual Controls')}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* 6 Visual Controls */}
            <VisualPillGroup label={t('লাইটিং', 'Lighting')} options={LIGHTING_OPTIONS} value={lightingMood} onChange={v => setLightingMood(v as LightingMood)} t={t} />
            <VisualPillGroup label={t('কালার মুড', 'Color Mood')} options={COLOR_MOOD_OPTIONS} value={colorMood} onChange={v => setColorMood(v as ColorMood)} t={t} />
            <VisualPillGroup label={t('ক্যামেরা অ্যাঙ্গেল', 'Camera Angle')} options={CAMERA_ANGLE_OPTIONS} value={cameraAngle} onChange={v => setCameraAngle(v as CameraAngle)} t={t} />
            <VisualPillGroup label={t('ব্যাকগ্রাউন্ড', 'Background')} options={BACKGROUND_OPTIONS} value={backgroundComplexity} onChange={v => setBackgroundComplexity(v as BackgroundComplexity)} t={t} />
            <VisualPillGroup label={t('দিনের সময়', 'Time of Day')} options={TIME_OF_DAY_OPTIONS} value={timeOfDay} onChange={v => setTimeOfDay(v as TimeOfDay)} t={t} />
            <VisualPillGroup label={t('প্রোডাক্ট ফোকাস', 'Product Focus')} options={PRODUCT_FOCUS_OPTIONS} value={productFocus} onChange={v => setProductFocus(v as ProductFocus)} t={t} />

            {/* Format & Export */}
            <div className="space-y-3">
              <PillSelect label={t('ফরম্যাট', 'Format')} value={format}
                options={[{ label: '1:1', value: '1:1' }, { label: '4:5', value: '4:5' }, { label: '9:16', value: '9:16' }, { label: '16:9', value: '16:9' }]}
                onChange={v => setFormat(v as ImageFormat)} />
              <PillSelect label={t('এক্সপোর্ট', 'Export')} value={exportFormat}
                options={[{ label: 'PNG', value: 'png' }, { label: 'JPG', value: 'jpg' }]}
                onChange={v => setExportFormat(v as ExportFormat)} />
              {scene === 'onWhite' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={transparentBg} onChange={e => setTransparentBg(e.target.checked)} className="rounded border-border" />
                  <span className="text-xs">{t('স্বচ্ছ ব্যাকগ্রাউন্ড', 'Transparent background')}</span>
                </label>
              )}
            </div>

            {/* Continue Button */}
            <Button onClick={handleContinue} disabled={!canContinue} className="w-full bg-primary hover:bg-primary/90">
              <ArrowRight className="h-4 w-4 mr-2" />
              {t('চালিয়ে যান', 'Continue')}
            </Button>
          </>
        )}

        {step === 2 && (
          <PromptEditor
            prompt={prompt}
            onPromptChange={(p) => { setPrompt(p); if (p !== defaultPrompt) setPromptWasEnhanced(true); }}
            defaultPrompt={defaultPrompt}
            onBack={() => setStep(1)}
            onGenerate={handleGenerate}
            generating={generating}
            generateLabel={t('প্রোডাক্ট ফটো তৈরি করুন', 'Generate Product Photo')}
            generateIcon={<Camera className="h-4 w-4 mr-2" />}
            tabType="product_photo"
            creditCost={125}
          />
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('ফলাফল প্রস্তুত! ডানদিকে দেখুন।', 'Result ready! See it on the right.')}</p>
            <Button variant="outline" onClick={() => setStep(2)} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />{t('প্রম্পট সম্পাদনা ও পুনরায় তৈরি', 'Edit Prompt & Regenerate')}
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
              <p className="text-sm font-medium">{t('প্রোডাক্ট ফটো তৈরি হচ্ছে...', 'Generating product photo...')}</p>
              <p className="text-xs text-muted-foreground">{LOADING_MESSAGES[loadingMsgIdx]}</p>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.max(progress, 10)}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">~{Math.ceil(timeRemaining / 1000)}s {t('বাকি', 'remaining')}</p>
            </div>
          ) : resultUrl ? (
            <div className="w-full space-y-4">
              <img src={getCdnImageUrl(resultUrl, { width: 1200, quality: 90 })} alt="Product photo" className="w-full max-h-[500px] object-contain rounded-xl" />
              <Button onClick={() => navigate(`/dashboard/generate?tab=image&studio_image_url=${encodeURIComponent(resultUrl)}`)} className="w-full bg-primary hover:bg-primary/90">
                <ArrowRight className="h-4 w-4 mr-2" />{t('এটি দিয়ে অ্যাড তৈরি করুন', 'Make an Ad with This')}
              </Button>
              <div className="flex gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => { setResultUrl(null); setStep(2); }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />{t('ভ্যারিয়েশন', 'Generate Variation')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setScene(null); setResultUrl(null); setStep(1); }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />{t('সিন পরিবর্তন', 'Change Scene')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  const a = document.createElement('a'); a.href = resultUrl; a.download = `product_${Date.now()}.${exportFormat}`; a.click();
                }}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />{t('ডাউনলোড', 'Download')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toast.success(t('লাইব্রেরিতে সেভ হয়েছে', 'Saved to library'))}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />{t('সেভ', 'Save to Library')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              {productPreview ? (
                <img src={productPreview} alt="Product" className="h-40 w-40 object-cover rounded-xl border mx-auto" />
              ) : (
                <div className="h-40 w-40 rounded-xl border-2 border-dashed border-border flex items-center justify-center mx-auto">
                  <Package className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {scene ? t(`${SCENES.find(s => s.key === scene)?.labelBn} সিনে আপনার পণ্য`, `Your product in a ${SCENES.find(s => s.key === scene)?.labelEn} scene`) : t('ফলাফল এখানে দেখা যাবে', 'Result appears here')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPhotoTab;
