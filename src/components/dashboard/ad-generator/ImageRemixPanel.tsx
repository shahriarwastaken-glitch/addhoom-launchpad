import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Sparkles, Download, ArrowLeft, ImageIcon, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { LightingMood, ColorMood, CameraAngle, BackgroundComplexity, TimeOfDay, ProductFocus } from './types';
import {
  LIGHTING_OPTIONS, COLOR_MOOD_OPTIONS, CAMERA_ANGLE_OPTIONS,
  BACKGROUND_OPTIONS, TIME_OF_DAY_OPTIONS, PRODUCT_FOCUS_OPTIONS,
  SCENE_STYLE_DEFAULTS,
} from './types';

interface ImageRemixPanelProps {
  image: {
    id: string;
    image_url: string;
    cutout_url?: string;
    product_name?: string;
    style?: string;
    format?: string;
    text_config?: any;
    studio_config?: any;
  };
  workspaceId: string;
  onClose: () => void;
  onRemixComplete: (images: any[]) => void;
}

// Prompt constants (matching promptBuilders.ts)
const LIGHTING: Record<LightingMood, string> = {
  soft: 'soft diffused lighting, gentle shadows, even illumination',
  dramatic: 'dramatic high-contrast lighting, deep shadows, cinematic chiaroscuro effect',
  natural: 'natural ambient lighting, soft outdoor light, warm sunlight feel',
  bright: 'bright clean lighting, high key, minimal shadows, airy feel',
};
const COLOR: Record<ColorMood, string> = {
  warm: 'warm color grading, golden amber tones, rich earthy palette',
  cool: 'cool color grading, blue and grey tones, clean crisp palette',
  neutral: 'neutral color grading, balanced tones, true-to-life colors',
  bold: 'bold vibrant color grading, saturated tones, high impact palette',
};
const ANGLE: Record<CameraAngle, string> = {
  front: 'straight-on front facing angle, product fully visible',
  three_quarter: '3/4 angle perspective, adds depth and dimension',
  overhead: 'overhead flat lay perspective, bird\'s eye view',
  closeup: 'close-up detail shot, texture emphasized, macro feel',
};
const BACKGROUND: Record<BackgroundComplexity, string> = {
  minimal: 'minimal clean background, negative space dominant',
  moderate: 'moderately styled background, balanced composition',
  rich: 'richly detailed background, full environmental context',
};
const TIME: Record<TimeOfDay, string> = {
  morning: 'fresh morning light, soft directional sunlight',
  golden: 'warm golden hour light, rich amber glow',
  midday: 'bright midday light, strong even illumination',
  night: 'night atmosphere, artificial warm lighting, moody ambient',
};
const FOCUS: Record<ProductFocus, string> = {
  hero: 'product is the undisputed hero of the frame, large and centered',
  environmental: 'product lives naturally in its environment, lifestyle story',
  detail: 'detail and texture focused, craftsmanship emphasized',
};

const STYLE_TEMPLATES: Record<string, string> = {
  studio: 'Professional studio product photography. Seamless paper backdrop. Softbox lighting. Clean minimal environment.',
  lifestyle: 'Realistic lifestyle environment. Natural light. Complementary props. Soft bokeh background.',
  flatlay: 'Overhead flat lay photography. Textured surface. Even soft diffused lighting. Clean editorial style.',
  gradient: 'Smooth bold color gradient background. Subtle grain texture. Modern editorial aesthetic.',
  outdoor: 'Aspirational outdoor environment. Golden hour or soft overcast daylight. Premium lifestyle feel.',
};

const PRODUCT_FIDELITY_BLOCK = `PRODUCT FIDELITY — CRITICAL:
- Product must appear EXACTLY ONCE
- Maintain EXACT same orientation, shape, proportions, surface textures, and colors
- Do not stylize, distort, add logos, alter colors, or reimagine the product
- Generate only the environment AROUND the product`;

const SCENE_OPTIONS = [
  { value: 'studio', label: 'Studio' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'flatlay', label: 'Flat Lay' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'outdoor', label: 'Outdoor' },
];

function buildImageRemixPrompt(config: {
  productName: string;
  style: string;
  lightingMood: LightingMood;
  colorMood: ColorMood;
  cameraAngle: CameraAngle;
  backgroundComplexity: BackgroundComplexity;
  timeOfDay: TimeOfDay;
  productFocus: ProductFocus;
  variationCount: number;
}): string {
  return `Product advertisement photography of ${config.productName}.

This is a remix — generate a fresh interpretation of the same visual style. Keep the overall look and feel consistent with the original while introducing natural variation.

SCENE: ${STYLE_TEMPLATES[config.style] || STYLE_TEMPLATES.studio}
COMPOSITION: ${ANGLE[config.cameraAngle]}
PRODUCT ROLE: ${FOCUS[config.productFocus]}
BACKGROUND: ${BACKGROUND[config.backgroundComplexity]}
LIGHTING: ${LIGHTING[config.lightingMood]}
TIME: ${TIME[config.timeOfDay]}
COLOR: ${COLOR[config.colorMood]}

VARIATION NOTE:
Generate ${config.variationCount} variation(s). Each should introduce natural scene variation — different props arrangement, slightly different light angle, subtle environment differences. Keep the same visual DNA throughout.

${PRODUCT_FIDELITY_BLOCK}

NO TEXT: No words, labels, prices, watermarks anywhere in the image.

QUALITY: 8K, perfect exposure, professional color grading, luxury brand campaign quality.`.trim();
}

type Step = 'controls' | 'prompt' | 'results';

const ImageRemixPanel = ({ image, workspaceId, onClose, onRemixComplete }: ImageRemixPanelProps) => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  // Visual controls
  const defaults = SCENE_STYLE_DEFAULTS[image.style || 'studio'] || SCENE_STYLE_DEFAULTS.studio;
  const savedConfig = image.studio_config || {};

  const [style, setStyle] = useState(image.style || 'studio');
  const [lightingMood, setLightingMood] = useState<LightingMood>(savedConfig.lightingMood || defaults.lightingMood);
  const [colorMood, setColorMood] = useState<ColorMood>(savedConfig.colorMood || defaults.colorMood);
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>(savedConfig.cameraAngle || defaults.cameraAngle);
  const [backgroundComplexity, setBackgroundComplexity] = useState<BackgroundComplexity>(savedConfig.backgroundComplexity || defaults.backgroundComplexity);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(savedConfig.timeOfDay || defaults.timeOfDay);
  const [productFocus, setProductFocus] = useState<ProductFocus>(savedConfig.productFocus || defaults.productFocus);
  const [variations, setVariations] = useState(3);

  const [step, setStep] = useState<Step>('controls');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);

  // Build prompt when moving to prompt step
  const goToPrompt = () => {
    const p = buildImageRemixPrompt({
      productName: image.product_name || 'the product',
      style,
      lightingMood,
      colorMood,
      cameraAngle,
      backgroundComplexity,
      timeOfDay,
      productFocus,
      variationCount: variations,
    });
    setPrompt(p);
    setStep('prompt');
  };

  const handleEnhance = async () => {
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: { prompt, type: 'image_remix' },
      });
      if (!error && data?.enhanced_prompt) {
        setPrompt(data.enhanced_prompt);
        toast.success(t('প্রম্পট উন্নত হয়েছে', 'Prompt enhanced'));
      }
    } catch {
      toast.error(t('উন্নত করতে সমস্যা', 'Enhancement failed'));
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('remix-image-fresh', {
        body: {
          workspace_id: workspaceId,
          source_image_id: image.id,
          style,
          change_elements: ['Lighting', 'Background Color', 'Camera Angle'],
          variations,
          text_config: image.text_config,
          remix_prompt: prompt,
          lighting_mood: lightingMood,
          color_mood: colorMood,
          camera_angle: cameraAngle,
          background_complexity: backgroundComplexity,
          time_of_day: timeOfDay,
          product_focus: productFocus,
        },
      });
      if (error) throw error;
      if (data?.success && data.images?.length) {
        setResults(data.images);
        onRemixComplete(data.images);
        setStep('results');
        toast.success(t(`${data.images.length}টি রিমিক্স তৈরি হয়েছে`, `${data.images.length} remixes created`));
      } else {
        toast.error(data?.message || t('রিমিক্স ব্যর্থ', 'Remix failed'));
      }
    } catch {
      toast.error(t('রিমিক্স ব্যর্থ হয়েছে', 'Remix failed'));
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${name}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('Download failed');
    }
  };

  const PillSelect = ({ options, value, onChange }: {
    options: { label: string; labelEn: string; value: string; emoji?: string }[];
    value: string;
    onChange: (v: any) => void;
  }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            value === opt.value
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-input text-foreground hover:border-primary/40'
          }`}
        >
          {opt.emoji && <span className="mr-1">{opt.emoji}</span>}
          {lang === 'bn' ? opt.label : opt.labelEn}
        </button>
      ))}
    </div>
  );

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
      className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-card border-l border-border z-50 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div>
          <h3 className="text-base font-bold font-heading-bn text-foreground flex items-center gap-2">
            <RefreshCw size={16} className="text-primary" />
            {t('ইমেজ রিমিক্স', 'Remix This Image')}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('একই স্টাইলে নতুন ভেরিয়েশন তৈরি করুন', 'Generate similar variations')}
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
          <X size={18} />
        </button>
      </div>

      {/* Original image thumbnail */}
      <div className="px-5 pt-4 shrink-0">
        <div className="rounded-xl overflow-hidden border border-border h-[120px]">
          <img src={image.image_url} alt="Original" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">
          {/* STEP 1: Visual Controls */}
          {step === 'controls' && (
            <motion.div key="controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">{t('ভ্যারিয়েশনের জন্য অ্যাডজাস্ট করুন', 'Adjust for variations')}</p>
                <p className="text-[10px] text-muted-foreground mb-3">{t('যা পরিবর্তন করতে চান পরিবর্তন করুন। ডিফল্ট রাখলে মূল ইমেজের কাছাকাছি থাকবে।', 'Change what you want to vary. Keep defaults to stay close to the original.')}</p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Scene Style</label>
                <div className="flex flex-wrap gap-1.5">
                  {SCENE_OPTIONS.map(s => (
                    <button key={s.value} onClick={() => {
                      setStyle(s.value);
                      const d = SCENE_STYLE_DEFAULTS[s.value] || SCENE_STYLE_DEFAULTS.studio;
                      setLightingMood(d.lightingMood);
                      setColorMood(d.colorMood);
                      setCameraAngle(d.cameraAngle);
                      setBackgroundComplexity(d.backgroundComplexity);
                      setTimeOfDay(d.timeOfDay);
                      setProductFocus(d.productFocus);
                    }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        style === s.value ? 'border-primary bg-primary/10 text-primary' : 'border-input text-foreground hover:border-primary/40'
                      }`}
                    >{s.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Lighting</label>
                <PillSelect options={LIGHTING_OPTIONS} value={lightingMood} onChange={setLightingMood} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Color Mood</label>
                <PillSelect options={COLOR_MOOD_OPTIONS} value={colorMood} onChange={setColorMood} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Camera</label>
                <PillSelect options={CAMERA_ANGLE_OPTIONS} value={cameraAngle} onChange={setCameraAngle} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Background</label>
                <PillSelect options={BACKGROUND_OPTIONS} value={backgroundComplexity} onChange={setBackgroundComplexity} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Time of Day</label>
                <PillSelect options={TIME_OF_DAY_OPTIONS} value={timeOfDay} onChange={setTimeOfDay} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Product Focus</label>
                <PillSelect options={PRODUCT_FOCUS_OPTIONS} value={productFocus} onChange={setProductFocus} />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Variations</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(n => (
                    <button key={n} onClick={() => setVariations(n)}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${variations === n ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
                    >{n}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Prompt */}
          {step === 'prompt' && (
            <motion.div key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">{t('রিমিক্স প্রম্পট', 'Remix Prompt')}</label>
                <button
                  onClick={handleEnhance}
                  disabled={enhancing}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent text-accent-foreground hover:brightness-110 transition-all flex items-center gap-1 disabled:opacity-60"
                >
                  <Sparkles size={11} />
                  {enhancing ? '...' : t('✨ এনহ্যান্স', '✨ Enhance')}
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full min-h-[220px] rounded-xl border border-input bg-card px-3 py-2.5 text-[13px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  {t('এটি AI-কে পাঠানো হবে।', 'This is what gets sent to the AI.')}
                </p>
                <button onClick={goToPrompt} className="text-[10px] text-primary hover:underline">
                  {t('রিসেট ↺', 'Reset ↺')}
                </button>
              </div>
              <button
                onClick={() => setStep('controls')}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ArrowLeft size={12} /> {t('← পিছনে', '← Back')}
              </button>
            </motion.div>
          )}

          {step === 'results' && (() => {
            const validResults = results.filter(img => img.image_url && img.image_url !== '');
            const failedCount = results.length - validResults.length;
            return (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <h4 className="text-sm font-bold font-heading-bn text-foreground">
                {failedCount > 0
                  ? t(`আপনার রিমিক্স — ${validResults.length}/${results.length}টি তৈরি হয়েছে`, `Your Remixes — ${validResults.length} of ${results.length} generated`)
                  : t(`আপনার রিমিক্স — ${validResults.length}টি তৈরি হয়েছে`, `Your Remixes — ${validResults.length} generated`)
                }
              </h4>
              {failedCount > 0 && (
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2"
                  style={{ background: 'rgba(255,184,0,0.08)', borderColor: 'rgba(255,184,0,0.3)' }}
                >
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  <p className="text-[12px] font-heading-bn text-foreground">
                    {t(`${failedCount}টি ব্যর্থ হয়েছে — নিচে পুনরায় চেষ্টা করুন`, `${failedCount} failed — retry below`)}
                  </p>
                </div>
              )}
              <div className="space-y-3">
                {validResults.map((img, i) => (
                  <div key={img.id || i} className="rounded-xl border border-border overflow-hidden bg-card">
                    <img src={img.image_url} alt={`Remix ${i + 1}`} className="w-full h-auto object-cover" loading="lazy" />
                    <div className="flex items-center gap-2 p-2.5">
                      <button
                        onClick={() => navigate(`/dashboard/generate?tab=image&preload_image=${encodeURIComponent(img.image_url)}`)}
                        className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-bold font-heading-bn hover:brightness-110 transition-all flex items-center justify-center gap-1"
                      >
                        <ImageIcon size={12} /> {t('এড বানান →', 'Make an Ad →')}
                      </button>
                      <button
                        onClick={() => downloadImage(img.image_url, `remix-${i + 1}`)}
                        className="h-9 px-3 rounded-lg border border-input text-xs text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        onClick={() => {
                          setResults([]);
                          setStep('controls');
                        }}
                        className="h-9 px-3 rounded-lg border border-input text-xs text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
                      >
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {/* Failed slot cards */}
                {failedCount > 0 && Array.from({ length: failedCount }).map((_, i) => (
                  <div key={`failed-${i}`} className="flex flex-col items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-border bg-secondary/30 py-8">
                    <AlertTriangle size={20} className="text-muted-foreground" />
                    <p className="text-xs font-heading-bn text-muted-foreground">{t('ব্যর্থ হয়েছে', 'Failed')}</p>
                    <button
                      onClick={() => { setResults([]); setStep('controls'); }}
                      className="px-3 py-1.5 rounded-lg border border-input text-[11px] font-bold text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
                    >
                      <RefreshCw size={11} /> {t('পুনরায় চেষ্টা', 'Retry')}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Sticky bottom */}
      {step !== 'results' && (
        <div className="shrink-0 px-5 py-4 border-t border-border bg-card">
          {step === 'controls' ? (
            <button
              onClick={goToPrompt}
              className="w-full h-11 rounded-[14px] bg-primary text-primary-foreground font-bold font-heading-bn text-[15px] hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              {t('পরবর্তী →', 'Continue →')}
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full h-11 rounded-[14px] bg-primary text-primary-foreground font-bold font-heading-bn text-[15px] hover:brightness-110 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <><RefreshCw size={16} className="animate-spin" /> {t('তৈরি হচ্ছে...', 'Generating...')}</>
              ) : (
                t('রিমিক্স তৈরি করুন →', 'Generate Remixes →')
              )}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ImageRemixPanel;
