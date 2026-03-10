import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image, Film, Upload, X, GripVertical, Play, Pause, Download,
  ArrowRight, ArrowLeft, RefreshCw, Save, Clapperboard,
  Maximize, Volume2, VolumeX as VolumeOff, Loader2, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUpgrade } from '@/contexts/UpgradeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StepIndicator from '@/components/dashboard/studio/StepIndicator';
import PromptEditor from '@/components/dashboard/studio/PromptEditor';
import { buildMotionPrompt } from '@/components/dashboard/studio/promptBuilders';

// ── Types ──

type InputMode = 'single' | 'multiple';
type MotionStyle = 'cinematic_reveal' | 'float_rotate' | 'zoom_pan' | 'lifestyle_motion' | 'energy_burst' | 'subtle_breathe';
type AspectRatio = '9:16' | '1:1' | '16:9';

interface MotionStyleOption {
  value: MotionStyle;
  icon: React.ReactNode;
  label: string;
  labelEn: string;
  desc: string;
  descEn: string;
  best: string;
  bestEn: string;
}

const MOTION_STYLES: MotionStyleOption[] = [
  {
    value: 'cinematic_reveal',
    icon: <Clapperboard size={18} />,
    label: 'সিনেম্যাটিক রিভিল',
    labelEn: 'Cinematic Reveal',
    desc: 'ধীরে ড্রামাটিক পুশ-ইন, পণ্য গভীরতা থেকে আবির্ভূত হয়',
    descEn: 'Slow dramatic push-in, product emerges from depth',
    best: 'প্রিমিয়াম পণ্য, জুয়েলারি, বিউটি',
    bestEn: 'Premium products, jewelry, beauty',
  },
  {
    value: 'float_rotate',
    icon: <RefreshCw size={18} />,
    label: 'ফ্লোট ও রোটেট',
    labelEn: 'Float & Rotate',
    desc: 'পণ্য ৩D স্পেসে মৃদুভাবে ভেসে ঘোরে',
    descEn: 'Product gently floats and rotates in 3D space',
    best: 'ইলেকট্রনিক্স, এক্সেসরিজ, বোতল',
    bestEn: 'Electronics, accessories, bottles',
  },
  {
    value: 'zoom_pan',
    icon: <Maximize size={18} />,
    label: 'জুম ও প্যান',
    labelEn: 'Zoom & Pan',
    desc: 'ডাইনামিক জুম, পণ্যের বৈশিষ্ট্য জুড়ে প্যান',
    descEn: 'Dynamic zoom into product details, pans across features',
    best: 'ফ্যাশন, জুতা, ডিটেইলড পণ্য',
    bestEn: 'Fashion, shoes, detailed products',
  },
  {
    value: 'lifestyle_motion',
    icon: <Play size={18} />,
    label: 'লাইফস্টাইল মোশন',
    labelEn: 'Lifestyle Motion',
    desc: 'ক্যামেরা লাইফস্টাইল সিনের মধ্য দিয়ে চলে',
    descEn: 'Camera moves through a lifestyle scene',
    best: 'হোম, ফুড, অ্যাপারেল',
    bestEn: 'Home, food, apparel',
  },
  {
    value: 'energy_burst',
    icon: <Sparkles size={18} />,
    label: 'এনার্জি বার্স্ট',
    labelEn: 'Energy Burst',
    desc: 'দ্রুত ডাইনামিক মোশন, হাই এনার্জি',
    descEn: 'Fast dynamic motion, high energy, particles and light',
    best: 'স্পোর্টস, ইয়ুথ প্রোডাক্ট, সেল',
    bestEn: 'Sports, youth products, sales',
  },
  {
    value: 'subtle_breathe',
    icon: <Volume2 size={18} />,
    label: 'সাটল ব্রিদ',
    labelEn: 'Subtle Breathe',
    desc: 'মিনিমাল মোশন, নরম আলোর পরিবর্তন',
    descEn: 'Minimal motion, soft light shift, almost still but alive',
    best: 'লাক্সারি, মিনিমালিস্ট, স্কিনকেয়ার',
    bestEn: 'Luxury, minimalist, skincare',
  },
];

const ASPECT_OPTIONS: { value: AspectRatio; label: string; labelEn: string }[] = [
  { value: '9:16', label: '9:16 রিলস', labelEn: '9:16 Reels' },
  { value: '1:1', label: '1:1 ফিড', labelEn: '1:1 Feed' },
  { value: '16:9', label: '16:9 ল্যান্ডস্কেপ', labelEn: '16:9 Landscape' },
];

const PROCESSING_MESSAGES = [
  { bn: 'আপনার পণ্য বিশ্লেষণ করা হচ্ছে...', en: 'Analyzing your product...' },
  { bn: 'মোশন জেনারেট হচ্ছে...', en: 'Generating motion...' },
  { bn: 'ফ্রেম রেন্ডার হচ্ছে...', en: 'Rendering frames...' },
  { bn: 'প্রায় শেষ হয়ে এসেছে...', en: 'Almost done...' },
];

const MAX_SIZE = 10 * 1024 * 1024;

const AIMotionTab = () => {
  const { t, lang } = useLanguage();
  const { user, profile, activeWorkspace } = useAuth();
  const { showUpgrade } = useUpgrade();

  // Form state
  const [inputMode, setInputMode] = useState<InputMode>('single');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [motionStyle, setMotionStyle] = useState<MotionStyle>('cinematic_reveal');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [productName, setProductName] = useState('');

  // Flow state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [prompt, setPrompt] = useState('');
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [processingMsgIdx, setProcessingMsgIdx] = useState(0);
  const [resultVideoUrl, setResultVideoUrl] = useState('');
  const [resultId, setResultId] = useState('');
  const [videoMuted, setVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingTimerRef = useRef<ReturnType<typeof setInterval>>();

  const plan = profile?.plan || 'free';

  // ── File handling ──

  const handleFiles = useCallback((files: FileList | File[]) => {
    const maxCount = inputMode === 'single' ? 1 : 4;
    const arr = Array.from(files).filter(f => {
      if (!f.type.startsWith('image/')) { toast.error(t('শুধু ছবি আপলোড করুন', 'Only images allowed')); return false; }
      if (f.size > MAX_SIZE) { toast.error(t('ছবি 10MB এর কম হতে হবে', 'Image must be under 10MB')); return false; }
      return true;
    });
    const total = images.length + arr.length;
    if (total > maxCount) { toast.error(t(`সর্বোচ্চ ${maxCount}টি ছবি`, `Maximum ${maxCount} images`)); return; }

    arr.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => [...prev, file]);
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, [images.length, inputMode, t]);

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    if (mode === 'single' && images.length > 1) {
      setImages([images[0]]);
      setImagePreviews([imagePreviews[0]]);
    }
  };

  // ── Continue to prompt step ──

  const handleContinue = () => {
    if (!productName.trim()) { toast.error(t('পণ্যের নাম দিন', 'Enter product name')); return; }
    if (images.length === 0) { toast.error(t('ছবি আপলোড করুন', 'Upload an image')); return; }

    const built = buildMotionPrompt({
      motionStyle,
      productName,
      productCategory: '',
      inputMode,
      aspectRatio,
    });
    setPrompt(built);
    setDefaultPrompt(built);
    setStep(2);
  };

  // ── Generate ──

  const handleGenerate = async () => {
    if (!activeWorkspace || !user) { toast.error(t('শপ তৈরি করুন', 'Create a shop first')); return; }

    setGenerating(true);
    setStep(3);
    setProcessingMsgIdx(0);

    processingTimerRef.current = setInterval(() => {
      setProcessingMsgIdx(prev => (prev + 1) % PROCESSING_MESSAGES.length);
    }, 4000);

    try {
      // Convert images to base64
      const imageBase64s = await Promise.all(
        images.map(img => new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(img);
        }))
      );

      const { data, error } = await supabase.functions.invoke('generate-ai-video', {
        body: {
          workspace_id: activeWorkspace.id,
          input_mode: inputMode,
          images: imageBase64s,
          motion_style: motionStyle,
          aspect_ratio: aspectRatio,
          motion_prompt: prompt,
          product_name: productName,
        },
      });

      if (error) throw error;
      if (data?.video_url) {
        setResultVideoUrl(data.video_url);
        setResultId(data.id || '');
      } else {
        throw new Error(data?.error || 'Generation failed');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(t('ভিডিও তৈরি ব্যর্থ', 'Video generation failed'));
      setStep(2);
    } finally {
      setGenerating(false);
      if (processingTimerRef.current) clearInterval(processingTimerRef.current);
    }
  };

  // ── Reset ──

  const handleTryDifferent = () => {
    setMotionStyle('cinematic_reveal');
    setPrompt('');
    setResultVideoUrl('');
    setResultId('');
    setStep(1);
  };

  const handleGenerateVariation = () => {
    setResultVideoUrl('');
    handleGenerate();
  };

  const handleDownload = async () => {
    if (!resultVideoUrl) return;
    try {
      const res = await fetch(resultVideoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-motion-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('ডাউনলোড ব্যর্থ', 'Download failed'));
    }
  };

  const canContinue = images.length > 0 && productName.trim().length > 0;

  // ── Render ──

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel */}
      <div className="w-full lg:w-[40%] border-r border-border overflow-y-auto p-4 sm:p-6">
        <StepIndicator
          currentStep={step}
          labels={[
            t('অপশন', 'Options'),
            t('প্রম্পট', 'Prompt'),
            t('রেজাল্ট', 'Result'),
          ]}
        />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="options" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
              {/* Input Mode */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block">
                  {t('কী অ্যানিমেট করছেন?', 'What are you animating?')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { mode: 'single' as InputMode, icon: <Image size={20} />, label: t('একটি ছবি', 'Single Image'), desc: t('AI একটি পণ্যের ছবিকে মোশনে রূপান্তর করবে', 'AI animates one product image into motion') },
                    { mode: 'multiple' as InputMode, icon: <Film size={20} />, label: t('একাধিক ছবি', 'Multiple Images'), desc: t('AI ২-৪টি ছবি জুড়ে ফ্লোয়িং ভিডিও তৈরি করবে', 'AI creates a flowing video across 2-4 images') },
                  ].map(opt => (
                    <button
                      key={opt.mode}
                      onClick={() => handleInputModeChange(opt.mode)}
                      className={`p-4 rounded-xl border-[1.5px] text-left transition-all ${
                        inputMode === opt.mode
                          ? 'border-primary bg-primary/[0.04] shadow-sm'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className={`mb-2 ${inputMode === opt.mode ? 'text-primary' : 'text-muted-foreground'}`}>{opt.icon}</div>
                      <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  {t('পণ্যের নাম', 'Product Name')} <span className="text-destructive">*</span>
                </label>
                <input
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  placeholder={t('যেমন: প্রিমিয়াম লেদার ব্যাগ', 'e.g. Premium Leather Bag')}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Upload */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  {inputMode === 'single' ? t('পণ্যের ছবি আপলোড', 'Upload Product Image') : t('পণ্যের ছবি আপলোড', 'Upload Product Images')}
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">
                  {inputMode === 'single'
                    ? t('একটি উচ্চমানের পণ্যের ছবি সবচেয়ে ভালো কাজ করে', 'One high-quality product photo works best')
                    : t('২ থেকে ৪টি ছবি · ড্র্যাগ করে সাজান', '2 to 4 images · drag to reorder')
                  }
                </p>

                {imagePreviews.length === 0 ? (
                  <label
                    className="block border-2 border-dashed rounded-xl min-h-[120px] flex flex-col items-center justify-center cursor-pointer border-border bg-secondary hover:border-primary/40 transition-all"
                  >
                    <input ref={fileInputRef} type="file" accept="image/*" multiple={inputMode === 'multiple'} className="hidden"
                      onChange={e => { e.target.files && handleFiles(Array.from(e.target.files)); e.target.value = ''; }} />
                    <Upload size={28} className="text-muted-foreground mb-1.5" />
                    <p className="text-sm text-muted-foreground">{t('ক্লিক করুন বা টেনে আনুন', 'Click or drag to upload')}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WEBP · Max 10MB</p>
                  </label>
                ) : (
                  <div className="border border-border rounded-xl p-3 bg-secondary">
                    <div className="flex gap-2 flex-wrap">
                      {imagePreviews.map((preview, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} className="text-destructive" />
                          </button>
                          {inputMode === 'multiple' && (
                            <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-background/70 text-foreground px-1 rounded">{idx + 1}</span>
                          )}
                        </div>
                      ))}
                      {imagePreviews.length < (inputMode === 'single' ? 1 : 4) && (
                        <label
                          className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                        >
                          <input type="file" accept="image/*" multiple={inputMode === 'multiple'} className="hidden"
                            onChange={e => { e.target.files && handleFiles(Array.from(e.target.files)); e.target.value = ''; }} />
                          <span className="text-lg">+</span>
                        </label>
                      )}
                    </div>
                    {inputMode === 'multiple' && imagePreviews.length > 1 && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        <GripVertical size={10} className="inline mr-0.5" />
                        {t('ছবি এই ক্রমে প্লে হবে', 'Images play in this order')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Motion Style */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block">
                  {t('মোশন স্টাইল', 'Motion Style')}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {MOTION_STYLES.map(style => (
                    <button
                      key={style.value}
                      onClick={() => setMotionStyle(style.value)}
                      className={`p-3 rounded-xl border-[1.5px] text-left transition-all ${
                        motionStyle === style.value
                          ? 'border-primary bg-primary/[0.04] shadow-sm'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={motionStyle === style.value ? 'text-primary' : 'text-muted-foreground'}>{style.icon}</span>
                        <span className="text-sm font-semibold text-foreground">{lang === 'bn' ? style.label : style.labelEn}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{lang === 'bn' ? style.desc : style.descEn}</p>
                      <p className="text-[10px] text-primary/70 mt-1">{lang === 'bn' ? style.best : style.bestEn}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block">
                  {t('ফরম্যাট', 'Format')}
                </label>
                <div className="flex gap-2">
                  {ASPECT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAspectRatio(opt.value)}
                      className={`flex-1 px-3 py-2.5 rounded-xl border-[1.5px] text-sm font-medium transition-all ${
                        aspectRatio === opt.value
                          ? 'border-primary bg-primary/[0.04] text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      {lang === 'bn' ? opt.label : opt.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Continue Button */}
              <div className="sticky bottom-0 pt-3 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 bg-gradient-to-t from-background via-background to-transparent">
                <Button
                  onClick={handleContinue}
                  disabled={!canContinue}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {t('চালিয়ে যান', 'Continue')} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="prompt" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <PromptEditor
                prompt={prompt}
                onPromptChange={setPrompt}
                defaultPrompt={defaultPrompt}
                onBack={() => setStep(1)}
                onGenerate={handleGenerate}
                generating={generating}
                generateLabel={t('ভিডিও তৈরি করুন', 'Generate Video')}
                generateIcon={<Film className="h-4 w-4 mr-2" />}
                tabType="ad_image"
                helperNote={t(
                  'মোশন বর্ণনা সম্পাদনা করুন — এটিই AI-তে পাঠানো হবে।',
                  'Edit the motion description — this is exactly what gets sent to the AI.'
                )}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Mobile: inline video + processing */}
              <div className="lg:hidden">
                {generating ? (
                  <div className="text-center space-y-3 py-6">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Loader2 size={24} className="text-primary animate-spin" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {t('আপনার AI ভিডিও তৈরি হচ্ছে...', 'Generating your AI video...')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(PROCESSING_MESSAGES[processingMsgIdx].bn, PROCESSING_MESSAGES[processingMsgIdx].en)}
                    </p>
                    <div className="w-40 h-1.5 rounded-full bg-muted overflow-hidden mx-auto">
                      <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">~30-60 {t('সেকেন্ড', 'seconds')}</p>
                  </div>
                ) : resultVideoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-border bg-background">
                    <video
                      ref={videoRef}
                      src={resultVideoUrl}
                      autoPlay
                      loop
                      muted={videoMuted}
                      playsInline
                      className="w-full max-h-[40vh] object-contain bg-black"
                    />
                    <div className="absolute bottom-2 right-2 flex gap-2">
                      <button
                        onClick={() => setVideoMuted(!videoMuted)}
                        className="w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
                      >
                        {videoMuted ? <VolumeOff size={14} /> : <Volume2 size={14} />}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {resultVideoUrl ? (
                <>
                  <div className="p-3 rounded-xl border border-primary/20 bg-primary/[0.03]">
                    <p className="text-sm font-semibold text-foreground mb-0.5">{t('ভিডিও তৈরি সম্পন্ন!', 'Video generation complete!')}</p>
                    <p className="text-xs text-muted-foreground">{t('5 সেকেন্ডের AI মোশন ভিডিও', '5-second AI motion video')}</p>
                  </div>

                  <Button onClick={handleDownload} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" /> {t('MP4 ডাউনলোড', 'Download MP4')}
                  </Button>

                  <Button onClick={handleTryDifferent} variant="outline" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" /> {t('ভিন্ন মোশন চেষ্টা করুন', 'Try Different Motion')}
                  </Button>

                  <Button onClick={handleGenerateVariation} variant="outline" className="w-full">
                    <Sparkles className="h-4 w-4 mr-2" /> {t('ভ্যারিয়েশন তৈরি', 'Generate Variation')}
                  </Button>
                </>
              ) : !generating ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {t('ভিডিও প্রস্তুত হলে এখানে দেখাবে', 'Video will appear here when ready')}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Panel - hidden on mobile for step 1 & 3 (inline on mobile) */}
      <div className={`flex-1 flex items-center justify-center p-4 sm:p-6 bg-secondary/30 overflow-hidden ${step === 1 || step === 3 ? 'hidden lg:flex' : ''}`}>
        {step === 1 && (
          <div className="text-center max-w-sm">
            {imagePreviews.length > 0 ? (
              <div className="space-y-4">
                {inputMode === 'single' ? (
                  <img src={imagePreviews[0]} alt="" className="max-h-[300px] mx-auto rounded-xl border border-border object-contain" />
                ) : (
                  <div className="flex gap-2 justify-center flex-wrap">
                    {imagePreviews.map((p, i) => (
                      <img key={i} src={p} alt="" className="w-24 h-24 rounded-lg border border-border object-cover" />
                    ))}
                  </div>
                )}
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                  <Film size={32} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t('আপনার 5s AI মোশন ভিডিও এখানে দেখা যাবে', 'Your 5s AI motion video will appear here')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-xl p-10 text-center">
                <Film size={40} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t('ছবি আপলোড করুন এবং স্টাইল বেছে নিন', 'Upload images and choose a style')}
                </p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="text-center max-w-sm">
            {imagePreviews.length > 0 && inputMode === 'single' && (
              <img src={imagePreviews[0]} alt="" className="max-h-[250px] mx-auto rounded-xl border border-border object-contain mb-4" />
            )}
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
              <Film size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('প্রম্পট রিভিউ করে "ভিডিও তৈরি করুন" ক্লিক করুন', 'Review prompt and click "Generate Video"')}
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="w-full max-w-lg">
            {generating ? (
              <div className="text-center space-y-4 py-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Loader2 size={28} className="text-primary animate-spin" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {t('আপনার AI ভিডিও তৈরি হচ্ছে...', 'Generating your AI video...')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(PROCESSING_MESSAGES[processingMsgIdx].bn, PROCESSING_MESSAGES[processingMsgIdx].en)}
                </p>
                <div className="w-48 h-1.5 rounded-full bg-muted overflow-hidden mx-auto">
                  <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
                <p className="text-[11px] text-muted-foreground">~30-60 {t('সেকেন্ড', 'seconds')}</p>
              </div>
            ) : resultVideoUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-border bg-background">
                <video
                  ref={videoRef}
                  src={resultVideoUrl}
                  autoPlay
                  loop
                  muted={videoMuted}
                  playsInline
                  className="w-full"
                />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button
                    onClick={() => setVideoMuted(!videoMuted)}
                    className="w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
                  >
                    {videoMuted ? <VolumeOff size={14} /> : <Volume2 size={14} />}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIMotionTab;
