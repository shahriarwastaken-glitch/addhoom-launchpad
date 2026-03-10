import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, Play, Download, ArrowRight, RefreshCw,
  Volume2, VolumeX as VolumeOff, Loader2, Sparkles, Film, ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUpgrade } from '@/contexts/UpgradeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AspectRatio = '9:16' | '1:1' | '16:9';

const ASPECT_OPTIONS: { value: AspectRatio; label: string; labelEn: string; icon: React.ReactNode }[] = [
  { value: '9:16', label: '9:16 রিলস', labelEn: '9:16 Reels', icon: <Film size={14} /> },
  { value: '1:1', label: '1:1 ফিড', labelEn: '1:1 Feed', icon: <ImageIcon size={14} /> },
  { value: '16:9', label: '16:9 ল্যান্ডস্কেপ', labelEn: '16:9 Landscape', icon: <Play size={14} /> },
];

const PROCESSING_MESSAGES = [
  { bn: 'আপনার পণ্য বিশ্লেষণ করা হচ্ছে...', en: 'Analyzing your product...' },
  { bn: 'মোশন জেনারেট হচ্ছে...', en: 'Generating motion...' },
  { bn: 'ফ্রেম রেন্ডার হচ্ছে...', en: 'Rendering frames...' },
  { bn: 'প্রায় শেষ হয়ে এসেছে...', en: 'Almost done...' },
];

const MAX_SIZE = 10 * 1024 * 1024;

const CATEGORY_PROMPTS: Record<string, (name: string) => string> = {
  furniture: (name) =>
    `Slowly zoom in from high angle, cut to close-up shot and present the ${name}, then cut to wide full shot and present the full ${name} from a cinematic angle.`,
  home: (name) =>
    `Slowly zoom in from high angle, cut to close-up shot and present the ${name}, then cut to wide full shot and present the full ${name} from a cinematic angle.`,
  default: (name) =>
    `A professional product photography of ${name} placed in a premium setting. The product is featured prominently with elegant lighting that highlights its key features. The background is carefully curated to complement the product's aesthetic.`,
};

function getDefaultPrompt(productName: string, industry?: string): string {
  const name = productName || 'the product';
  const cat = (industry || '').toLowerCase();
  if (cat.includes('furniture') || cat.includes('home')) {
    return CATEGORY_PROMPTS.furniture(name);
  }
  return CATEGORY_PROMPTS.default(name);
}

const AIMotionTab = () => {
  const { t, lang } = useLanguage();
  const { user, profile, activeWorkspace } = useAuth();
  const { showUpgrade } = useUpgrade();

  // Form state
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [prompt, setPrompt] = useState('');
  const [enhancing, setEnhancing] = useState(false);

  // Flow state
  const [generating, setGenerating] = useState(false);
  const [processingMsgIdx, setProcessingMsgIdx] = useState(0);
  const [resultVideoUrl, setResultVideoUrl] = useState('');
  const [resultId, setResultId] = useState('');
  const [videoMuted, setVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const processingTimerRef = useRef<ReturnType<typeof setInterval>>();

  const plan = profile?.plan || 'free';

  // Set default prompt when image is uploaded
  const setDefaultPromptFromWorkspace = useCallback(() => {
    const industry = activeWorkspace?.industry || '';
    const name = activeWorkspace?.shop_name || '';
    setPrompt(getDefaultPrompt(name, industry));
  }, [activeWorkspace]);

  // ── File handling ──
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { toast.error(t('শুধু ছবি আপলোড করুন', 'Only images allowed')); return; }
    if (file.size > MAX_SIZE) { toast.error(t('ছবি 10MB এর কম হতে হবে', 'Image must be under 10MB')); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(file);
      setImagePreview(e.target?.result as string);
      if (!prompt) setDefaultPromptFromWorkspace();
    };
    reader.readAsDataURL(file);
  }, [t, prompt, setDefaultPromptFromWorkspace]);

  const removeImage = () => {
    setImage(null);
    setImagePreview('');
  };

  // ── Enhance prompt ──
  const handleEnhance = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: { prompt, type: 'motion_video' },
      });
      if (error) throw error;
      if (data?.enhanced_prompt) {
        setPrompt(data.enhanced_prompt);
        toast.success(t('প্রম্পট উন্নত হয়েছে', 'Prompt enhanced'));
      }
    } catch {
      toast.error(t('উন্নত করতে ব্যর্থ', 'Failed to enhance'));
    } finally {
      setEnhancing(false);
    }
  };

  // ── Generate ──
  const handleGenerate = async () => {
    if (!activeWorkspace || !user) { toast.error(t('শপ তৈরি করুন', 'Create a shop first')); return; }
    if (!image) { toast.error(t('ছবি আপলোড করুন', 'Upload an image')); return; }
    if (!prompt.trim()) { toast.error(t('ভিডিওর বর্ণনা দিন', 'Describe your video')); return; }

    setGenerating(true);
    setProcessingMsgIdx(0);

    processingTimerRef.current = setInterval(() => {
      setProcessingMsgIdx(prev => (prev + 1) % PROCESSING_MESSAGES.length);
    }, 4000);

    try {
      const imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(image);
      });

      const { data, error } = await supabase.functions.invoke('generate-ai-video', {
        body: {
          workspace_id: activeWorkspace.id,
          images: [imageBase64],
          motion_prompt: prompt,
          aspect_ratio: aspectRatio,
          product_name: activeWorkspace.shop_name || '',
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
    } finally {
      setGenerating(false);
      if (processingTimerRef.current) clearInterval(processingTimerRef.current);
    }
  };

  // ── Reset ──
  const handleReset = () => {
    setImage(null);
    setImagePreview('');
    setPrompt('');
    setResultVideoUrl('');
    setResultId('');
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

  const canGenerate = !!image && prompt.trim().length > 0;
  const showResult = generating || resultVideoUrl;

  // ── Render ──
  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel — Form */}
      <div className="w-full lg:w-[45%] border-r border-border overflow-y-auto p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
              {/* Upload Section */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  {t('পণ্যের ছবি আপলোড করুন', 'Upload your product image')}
                </label>

                {!imagePreview ? (
                  <label className="block border-2 border-dashed rounded-xl min-h-[140px] flex flex-col items-center justify-center cursor-pointer border-border bg-secondary/50 hover:border-primary/40 transition-all">
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
                    <Upload size={28} className="text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{t('ক্লিক করুন বা টেনে আনুন', 'Click or drag to upload')}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WEBP · Max 10MB</p>
                  </label>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-border bg-secondary">
                    <img src={imagePreview} alt="" className="w-full max-h-[200px] object-contain" />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
                    >
                      <X size={14} className="text-destructive" />
                    </button>
                    <button
                      onClick={() => { removeImage(); }}
                      className="absolute bottom-2 left-2 text-[11px] text-primary underline underline-offset-2 bg-background/70 px-2 py-0.5 rounded"
                    >
                      {t('ছবি পরিবর্তন', 'Change image')}
                    </button>
                  </div>
                )}
              </div>

              {/* Prompt Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-foreground">
                    {t('ভিডিওর বর্ণনা দিন', 'Describe your video')}
                  </label>
                  <button
                    onClick={handleEnhance}
                    disabled={enhancing || !prompt.trim()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
                  >
                    {enhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {t('উন্নত করুন', 'Enhance')}
                  </button>
                </div>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={t(
                    'একটি প্রিমিয়াম সেটিংয়ে পণ্যটির পেশাদার প্রোডাক্ট ফটোগ্রাফি...',
                    'A professional product photography of [your product] placed in a premium setting...'
                  )}
                  className="w-full min-h-[160px] px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm resize-y focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-[\'Plus_Jakarta_Sans\',sans-serif]"
                />
              </div>

              {/* Settings Row */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  {t('ফরম্যাট', 'Format')}
                </label>
                <div className="flex gap-2">
                  {ASPECT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAspectRatio(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-[1.5px] text-xs font-medium transition-all ${
                        aspectRatio === opt.value
                          ? 'border-primary bg-primary/[0.04] text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      {opt.icon}
                      {lang === 'bn' ? opt.label : opt.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <div className="sticky bottom-0 pt-3 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 bg-gradient-to-t from-background via-background to-transparent">
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {t('ভিডিও তৈরি করুন', 'Generate Video')} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-[11px] text-muted-foreground text-center mt-1.5">
                  {t('ভিডিও তৈরি হতে ৩০-৬০ সেকেন্ড সময় লাগে', 'Videos take 30–60 seconds to generate')}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
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
                      autoPlay loop muted={videoMuted} playsInline
                      className="w-full max-h-[40vh] object-contain bg-black"
                    />
                    <div className="absolute bottom-2 right-2">
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

                  <Button onClick={handleReset} variant="outline" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" /> {t('নতুন ভিডিও তৈরি', 'Create New Video')}
                  </Button>

                  <Button onClick={handleGenerateVariation} variant="outline" className="w-full">
                    <Sparkles className="h-4 w-4 mr-2" /> {t('ভ্যারিয়েশন তৈরি', 'Generate Variation')}
                  </Button>
                </>
              ) : generating ? (
                <div className="hidden lg:block text-center py-6 text-muted-foreground text-sm">
                  {t('ভিডিও প্রস্তুত হচ্ছে...', 'Preparing video...')}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Panel — Preview (desktop only) */}
      <div className="flex-1 hidden lg:flex items-center justify-center p-4 sm:p-6 bg-secondary/30 overflow-hidden">
        {!showResult ? (
          <div className="text-center max-w-sm">
            {imagePreview ? (
              <div className="space-y-4">
                <img src={imagePreview} alt="" className="max-h-[300px] mx-auto rounded-xl border border-border object-contain" />
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
                  {t('ছবি আপলোড করুন এবং বর্ণনা দিন', 'Upload an image and describe your video')}
                </p>
              </div>
            )}
          </div>
        ) : (
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
                  autoPlay loop muted={videoMuted} playsInline
                  className="w-full"
                />
                <div className="absolute bottom-3 right-3">
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
