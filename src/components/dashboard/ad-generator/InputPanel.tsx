import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import OnceTooltip from '@/components/ui/OnceTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  PenLine, ImageIcon, Facebook, Instagram, ShoppingBag, Search,
  Target, AlertTriangle, BookOpen, CheckCircle, Zap, Gift,
  Smile, Briefcase, Flame, Square, Smartphone, Monitor,
  Sparkles, Palette, Camera, Upload, Rocket, History,
  ArrowRight,
} from 'lucide-react';
import StepIndicator from '@/components/dashboard/studio/StepIndicator';
import PromptEditor from '@/components/dashboard/studio/PromptEditor';
import { buildAdImagePrompt } from '@/components/dashboard/studio/promptBuilders';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
  GeneratorMode, GeneratorFormData, PLATFORMS, FRAMEWORKS,
  OCCASIONS, TONES, IMAGE_FORMATS, IMAGE_STYLES,
  LIGHTING_OPTIONS, COLOR_MOOD_OPTIONS, CAMERA_ANGLE_OPTIONS,
  BACKGROUND_OPTIONS, TIME_OF_DAY_OPTIONS, PRODUCT_FOCUS_OPTIONS,
  SCENE_STYLE_DEFAULTS,
} from './types';
import { getImageHistory } from './AdGeneratorPage';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook size={14} />,
  instagram: <Instagram size={14} />,
  daraz: <ShoppingBag size={14} />,
  google: <Search size={14} />,
};

const FRAMEWORK_ICONS: Record<string, React.ReactNode> = {
  target: <Target size={14} />,
  'alert-triangle': <AlertTriangle size={14} />,
  'book-open': <BookOpen size={14} />,
  'check-circle': <CheckCircle size={14} />,
  zap: <Zap size={14} />,
  gift: <Gift size={14} />,
};

const TONE_ICONS: Record<string, React.ReactNode> = {
  smile: <Smile size={14} />,
  briefcase: <Briefcase size={14} />,
  flame: <Flame size={14} />,
};

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  square: <Square size={14} />,
  smartphone: <Smartphone size={14} />,
  monitor: <Monitor size={14} />,
};

const STYLE_ICONS: Record<string, React.ReactNode> = {
  sparkles: <Sparkles size={14} />,
  palette: <Palette size={14} />,
  camera: <Camera size={14} />,
  flame: <Flame size={14} />,
};

interface InputPanelProps {
  mode: GeneratorMode;
  setMode: (m: GeneratorMode) => void;
  form: GeneratorFormData;
  setForm: (fn: (prev: GeneratorFormData) => GeneratorFormData) => void;
  onGenerate: (prompt?: string) => void;
  generating: boolean;
  onToggleImageHistory?: () => void;
  generateBtnRef?: React.RefObject<HTMLButtonElement>;
}

// Reusable pill selector for visual controls
const VisualPillGroup = ({
  label,
  options,
  value,
  onChange,
  t,
}: {
  label: string;
  options: { label: string; labelEn: string; value: string; emoji: string }[];
  value: string;
  onChange: (v: string) => void;
  t: (bn: string, en: string) => string;
}) => (
  <div>
    <label className="block text-[13px] font-semibold font-heading-bn text-foreground mb-1.5">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`h-9 px-3.5 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
            value === opt.value
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-input bg-card text-foreground hover:border-primary/40'
          }`}
        >
          <span>{opt.emoji}</span> {t(opt.label, opt.labelEn)}
        </button>
      ))}
    </div>
  </div>
);

const InputPanel = ({ mode, setMode, form, setForm, onGenerate, generating, onToggleImageHistory, generateBtnRef }: InputPanelProps) => {
  const { t } = useLanguage();
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const historyCount = useMemo(() => getImageHistory().length, []);

  // Two-step prompt flow for image mode
  const [imageStep, setImageStep] = useState<1 | 2>(1);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageDefaultPrompt, setImageDefaultPrompt] = useState('');

  const copyLoadingTexts = [t('চিন্তা করছি...', 'Thinking...'), t('লিখছি...', 'Writing...'), t('স্কোর করছি...', 'Scoring...')];
  const imageLoadingTexts = [t('প্রম্পট তৈরি হচ্ছে...', 'Creating prompt...'), t('AI ছবি আঁকছে...', 'AI drawing...'), t('ফিনিশিং টাচ...', 'Finishing touches...')];
  const loadingTexts = mode === 'copy' ? copyLoadingTexts : imageLoadingTexts;

  // Cycle loading text
  useState(() => {
    const interval = setInterval(() => setLoadingTextIdx(i => (i + 1) % 3), 1800);
    return () => clearInterval(interval);
  });

  const updateField = <K extends keyof GeneratorFormData>(key: K, value: GeneratorFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const togglePlatform = (p: string) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? (prev.platforms.length > 1 ? prev.platforms.filter(x => x !== p) : prev.platforms)
        : [...prev.platforms, p],
    }));
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) return;
    updateField('productImage', file);
    const reader = new FileReader();
    reader.onload = () => updateField('productImagePreview', reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      handleFileSelect(file);
    }
  };

  // Apply smart defaults when scene style changes (image mode)
  const handleStyleChange = (style: typeof form.imageStyle) => {
    const defaults = SCENE_STYLE_DEFAULTS[style];
    if (defaults) {
      setForm(prev => ({
        ...prev,
        imageStyle: style,
        lightingMood: defaults.lightingMood,
        colorMood: defaults.colorMood,
        cameraAngle: defaults.cameraAngle,
        backgroundComplexity: defaults.backgroundComplexity,
        timeOfDay: defaults.timeOfDay,
        productFocus: defaults.productFocus,
      }));
      const styleNames: Record<string, string> = {
        clean: 'Clean Product', creative: 'Creative', lifestyle: 'Lifestyle', sale: 'Sale/Offer',
      };
      toast.success(t(`${styleNames[style]} স্টাইলের জন্য ডিফল্ট আপডেট হয়েছে`, `Defaults updated for ${styleNames[style]} style`), { duration: 2000 });
    } else {
      updateField('imageStyle', style);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="flex-1 overflow-y-auto p-6 lg:p-7 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-heading-bn text-foreground">{t('বিজ্ঞাপন তৈরি করুন', 'Create Ad')}</h2>
          {mode === 'copy' ? (
            <Link to="/dashboard/ad-history" className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-heading-bn">
              <History size={12} /> {t('ইতিহাস', 'History')}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onToggleImageHistory?.()}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-heading-bn"
            >
              <History size={12} /> {t('ইমেজ হিস্ট্রি', 'Image History')}
              {historyCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                  {historyCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Mode toggle */}
        <div className="bg-secondary rounded-xl p-1 flex">
          {(['copy', 'image'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold font-heading-bn transition-all duration-200 flex items-center justify-center gap-1.5 ${
                mode === m
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'copy'
                ? <><PenLine size={15} /> {t('কপি জেনারেটর', 'Copy Generator')}</>
                : <><ImageIcon size={15} /> {t('ইমেজ জেনারেটর', 'Image Generator')}</>}
            </button>
          ))}
        </div>

        {/* Step indicator for image mode */}
        {mode === 'image' && (
          <StepIndicator
            currentStep={imageStep}
            labels={[t('অপশন', 'Options'), t('প্রম্পট', 'Prompt'), t('ফলাফল', 'Result')]}
          />
        )}

        {/* ── COPY MODE: keep all original fields ── */}
        {mode === 'copy' && (
          <>
            {/* Product Name */}
            <FieldGroup label={t('পণ্যের নাম', 'Product Name')} required>
              <input
                type="text"
                value={form.productName}
                onChange={e => updateField('productName', e.target.value)}
                maxLength={100}
                placeholder={t('যেমন: হ্যান্ডব্যাগ, স্মার্টফোন, শাড়ি...', 'e.g. Handbag, Smartphone, Saree...')}
                className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
              />
            </FieldGroup>

            {/* Description */}
            <FieldGroup label={t('পণ্যের বিবরণ', 'Product Description')}>
              <div className="relative">
                <textarea
                  value={form.productDesc}
                  onChange={e => updateField('productDesc', e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder={t(
                    'পণ্যের বৈশিষ্ট্য, উপকরণ, সুবিধা লিখুন...\nযত বেশি তথ্য দেবেন, বিজ্ঞাপন তত ভালো হবে।',
                    'Write product features, materials, benefits...\nMore details = better ads.'
                  )}
                  className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-none"
                />
                <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground">
                  {form.productDesc.length}/{t('৫০০', '500')}
                </span>
              </div>
            </FieldGroup>

            {/* Price */}
            <FieldGroup label={t('মূল্য (ঐচ্ছিক)', 'Price (Optional)')}>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-muted-foreground font-heading-bn">৳</span>
                <input
                  type="text"
                  value={form.price}
                  onChange={e => updateField('price', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={t('৯৯৯', '999')}
                  className="w-full rounded-xl border-[1.5px] border-input bg-card pl-7 pr-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
                />
              </div>
            </FieldGroup>

            {/* Platforms - copy mode only */}
            <FieldGroup label={t('কোন প্ল্যাটফর্মের জন্য?', 'Which platform?')} required>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(p => {
                  const selected = form.platforms.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      onClick={() => togglePlatform(p.value)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95"
                      style={{
                        borderColor: selected ? p.color : 'hsl(var(--border))',
                        backgroundColor: selected ? p.bg : 'hsl(var(--card))',
                        color: selected ? p.color : 'hsl(var(--foreground))',
                      }}
                    >
                      {PLATFORM_ICONS[p.value]} {t(p.label, p.labelEn)}
                    </button>
                  );
                })}
              </div>
            </FieldGroup>

            {/* Framework - copy mode only */}
            <FieldGroup label={t('বিজ্ঞাপনের কৌশল (Framework)', 'Ad Framework')}>
              <div className="grid grid-cols-2 gap-2">
                {FRAMEWORKS.map(f => (
                  <Tooltip key={f.value}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => updateField('framework', f.value)}
                        className={`px-3 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5 ${
                          form.framework === f.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-input bg-card text-foreground'
                        }`}
                      >
                        {FRAMEWORK_ICONS[f.icon]} {t(f.label, f.labelEn)}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-foreground text-background text-[11px] font-heading-bn">
                      {t(f.tooltip, f.tooltipEn)}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </FieldGroup>

            {/* Occasion - copy mode only */}
            <FieldGroup label={t('উপলক্ষ (Occasion)', 'Occasion')}>
              <Select value={form.occasion} onValueChange={v => updateField('occasion', v)}>
                <SelectTrigger className="rounded-xl border-[1.5px] border-input h-11 font-heading-bn text-[15px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OCCASIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="font-heading-bn">{t(o.label, o.labelEn)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            {/* Tone - copy mode only */}
            <FieldGroup label={t('টোন', 'Tone')}>
              <div className="flex gap-2">
                {TONES.map(tn => (
                  <button
                    key={tn.value}
                    onClick={() => updateField('tone', tn.value)}
                    className={`flex-1 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5 ${
                      form.tone === tn.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-card text-foreground'
                    }`}
                  >
                    {TONE_ICONS[tn.icon]} {t(tn.label, tn.labelEn)}
                  </button>
                ))}
              </div>
            </FieldGroup>

            {/* Num Variations */}
            <FieldGroup label={t('কতটি ভিন্ন ভার্শন?', 'How many variations?')}>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => updateField('numVariations', n)}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-all duration-150 active:scale-95 ${
                      form.numVariations === n
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-input text-foreground'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </FieldGroup>
          </>
        )}

        {/* ── IMAGE MODE ── */}
        {mode === 'image' && imageStep === 1 && (
          <div className="space-y-5">
            {/* Product Name */}
            <FieldGroup label={t('পণ্যের নাম', 'Product Name')} required>
              <input
                type="text"
                value={form.productName}
                onChange={e => updateField('productName', e.target.value)}
                maxLength={100}
                placeholder={t('যেমন: হ্যান্ডব্যাগ, স্মার্টফোন, শাড়ি...', 'e.g. Handbag, Smartphone, Saree...')}
                className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
              />
            </FieldGroup>

            {/* Product Image Upload */}
            <FieldGroup label={t('পণ্যের ছবি আপলোড', 'Upload Product Image')}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed p-7 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : form.productImagePreview
                      ? 'border-border bg-secondary'
                      : 'border-border bg-secondary hover:border-primary hover:bg-primary/[0.03]'
                }`}
              >
                {form.productImagePreview ? (
                  <div className="flex items-center gap-3">
                    <img src={form.productImagePreview} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
                    <div className="text-left">
                      <p className="text-sm font-heading-bn text-foreground truncate max-w-[140px]">{form.productImage?.name}</p>
                      <button
                        onClick={e => { e.stopPropagation(); updateField('productImage', null); updateField('productImagePreview', null); }}
                        className="text-xs text-primary font-heading-bn mt-1"
                      >
                        {t('পরিবর্তন করুন', 'Change')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload size={28} className="mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-heading-bn text-muted-foreground">{t('ছবি টেনে আনুন বা ক্লিক করুন', 'Drag image or click to upload')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('PNG, JPG • সর্বোচ্চ 5MB', 'PNG, JPG • Max 5MB')}</p>
                  </>
                )}
              </div>
            </FieldGroup>

            {/* Image Format */}
            <FieldGroup label={t('ইমেজ ফরম্যাট', 'Image Format')}>
              <div className="flex gap-2">
                {IMAGE_FORMATS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => updateField('imageFormat', f.value)}
                    className={`flex-1 py-2.5 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5 ${
                      form.imageFormat === f.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-card text-foreground'
                    }`}
                  >
                    {FORMAT_ICONS[f.icon]} {t(f.label, f.labelEn)}
                  </button>
                ))}
              </div>
            </FieldGroup>

            {/* Image Style (Scene) */}
            <FieldGroup label={t('স্টাইল', 'Style')}>
              <div className="grid grid-cols-2 gap-2">
                {IMAGE_STYLES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => handleStyleChange(s.value)}
                    className={`px-3 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5 ${
                      form.imageStyle === s.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-card text-foreground'
                    }`}
                  >
                    {STYLE_ICONS[s.icon]} {t(s.label, s.labelEn)}
                  </button>
                ))}
              </div>
            </FieldGroup>

            {/* Divider */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[12px] uppercase tracking-wider text-muted-foreground font-heading-bn">{t('ভিজ্যুয়াল কন্ট্রোল', 'Visual Controls')}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* 6 Visual Controls */}
            <VisualPillGroup
              label={t('লাইটিং', 'Lighting')}
              options={LIGHTING_OPTIONS}
              value={form.lightingMood}
              onChange={v => updateField('lightingMood', v as any)}
              t={t}
            />
            <VisualPillGroup
              label={t('কালার মুড', 'Color Mood')}
              options={COLOR_MOOD_OPTIONS}
              value={form.colorMood}
              onChange={v => updateField('colorMood', v as any)}
              t={t}
            />
            <VisualPillGroup
              label={t('ক্যামেরা অ্যাঙ্গেল', 'Camera Angle')}
              options={CAMERA_ANGLE_OPTIONS}
              value={form.cameraAngle}
              onChange={v => updateField('cameraAngle', v as any)}
              t={t}
            />
            <VisualPillGroup
              label={t('ব্যাকগ্রাউন্ড', 'Background')}
              options={BACKGROUND_OPTIONS}
              value={form.backgroundComplexity}
              onChange={v => updateField('backgroundComplexity', v as any)}
              t={t}
            />
            <VisualPillGroup
              label={t('দিনের সময়', 'Time of Day')}
              options={TIME_OF_DAY_OPTIONS}
              value={form.timeOfDay}
              onChange={v => updateField('timeOfDay', v as any)}
              t={t}
            />
            <VisualPillGroup
              label={t('প্রোডাক্ট ফোকাস', 'Product Focus')}
              options={PRODUCT_FOCUS_OPTIONS}
              value={form.productFocus}
              onChange={v => updateField('productFocus', v as any)}
              t={t}
            />

            {/* Brand Colors */}
            <FieldGroup label={t('ব্র্যান্ড রঙ (ঐচ্ছিক)', 'Brand Colors (Optional)')}>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground font-heading-bn">{t('প্রাথমিক', 'Primary')}</label>
                  <input
                    type="color"
                    value={form.brandColorPrimary}
                    onChange={e => updateField('brandColorPrimary', e.target.value)}
                    className="w-8 h-8 rounded-full border border-input cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground font-heading-bn">{t('মাধ্যমিক', 'Secondary')}</label>
                  <input
                    type="color"
                    value={form.brandColorSecondary}
                    onChange={e => updateField('brandColorSecondary', e.target.value)}
                    className="w-8 h-8 rounded-full border border-input cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => { updateField('brandColorPrimary', '#FF5100'); updateField('brandColorSecondary', '#FFFFFF'); }}
                  className="text-xs text-primary font-heading-bn ml-auto"
                >
                  {t('ব্র্যান্ড ডিফল্ট', 'Brand Default')}
                </button>
              </div>
            </FieldGroup>
          </div>
        )}

        {/* Image mode Step 2: shown inline for image mode */}
        {mode === 'image' && imageStep === 2 && (
          <PromptEditor
            prompt={imagePrompt}
            onPromptChange={setImagePrompt}
            defaultPrompt={imageDefaultPrompt}
            onBack={() => setImageStep(1)}
            onGenerate={() => onGenerate(imagePrompt)}
            generating={generating}
            generateLabel={t('ইমেজ বিজ্ঞাপন তৈরি করুন', 'Generate Image Ad')}
            generateIcon={<ImageIcon className="h-4 w-4 mr-2" />}
            tabType="ad_image"
            costNote={t('সাধারণত ৮-১৫ সেকেন্ড লাগে', 'Usually takes 8-15 seconds')}
          />
        )}

        {/* Spacer for sticky button */}
        <div className="h-20" />
      </div>

      {/* Sticky Generate/Continue Button */}
      <div className="sticky bottom-0 bg-gradient-to-t from-card via-card to-transparent px-6 lg:px-7 pb-5 pt-4">
        {mode === 'image' && imageStep === 1 ? (
          <button
            onClick={() => {
              const built = buildAdImagePrompt({
                productName: form.productName || 'the product',
                style: form.imageStyle,
                brandColors: [form.brandColorPrimary, form.brandColorSecondary].filter(c => c && c !== '#FFFFFF'),
                format: form.imageFormat,
                lightingMood: form.lightingMood,
                colorMood: form.colorMood,
                cameraAngle: form.cameraAngle,
                backgroundComplexity: form.backgroundComplexity,
                timeOfDay: form.timeOfDay,
                productFocus: form.productFocus,
              });
              setImageDefaultPrompt(built);
              setImagePrompt(built);
              setImageStep(2);
            }}
            disabled={!form.productName.trim() || !form.productImagePreview}
            className={`w-full h-[52px] rounded-[14px] font-bold text-[17px] font-heading-bn text-primary-foreground transition-all duration-200 ${
              (!form.productName.trim() || !form.productImagePreview)
                ? 'bg-primary/50 cursor-not-allowed opacity-60'
                : 'bg-primary hover:brightness-110 shadow-orange-glow active:scale-[0.98]'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <ArrowRight size={18} /> {t('চালিয়ে যান', 'Continue')}
            </span>
          </button>
        ) : mode === 'image' && imageStep === 2 ? (
          null /* PromptEditor already renders its own buttons */
        ) : (
          <button
            ref={generateBtnRef as any}
            onClick={() => onGenerate()}
            className={`w-full h-[52px] rounded-[14px] font-bold text-[17px] font-heading-bn text-primary-foreground transition-all duration-200 ${
              generating
                ? 'bg-primary/70 cursor-not-allowed opacity-80'
                : 'bg-primary hover:brightness-110 shadow-orange-glow active:scale-[0.98]'
            }`}
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <Rocket size={18} className="animate-bounce" />
                <span className="animate-pulse">{loadingTexts[loadingTextIdx % loadingTexts.length]}</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <PenLine size={18} /> {t('বিজ্ঞাপন কপি তৈরি করুন', 'Generate Ad Copy')}
              </span>
            )}
          </button>
        )}
        {mode !== 'image' || imageStep !== 2 ? (
          <p className="text-center text-[11px] text-muted-foreground mt-2 font-heading-bn">{t('সাধারণত ৮-১৫ সেকেন্ড লাগে', 'Usually takes 8-15 seconds')}</p>
        ) : null}
      </div>
    </div>
  );
};

const FieldGroup = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <label className="block text-[13px] font-semibold font-heading-bn text-foreground mb-1.5">
      {label} {required && <span className="text-primary">*</span>}
    </label>
    {children}
  </div>
);

export default InputPanel;
