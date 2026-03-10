import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import OnceTooltip from '@/components/ui/OnceTooltip';
import {
  PenLine, ImageIcon, Facebook, Instagram, ShoppingBag, Search,
  Target, AlertTriangle, BookOpen, CheckCircle, Zap, Gift,
  Smile, Briefcase, Flame, Square, Smartphone, Monitor,
  Sparkles, Palette, Camera, Upload, Rocket, History,
  ArrowRight, ChevronDown, HelpCircle, Sprout, Frown,
  Eye, MessageSquare, Send, Mail, FileText, Phone,
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
  COPY_PLATFORMS, COPY_LANGUAGES, COPY_TONES, AWARENESS_STAGES,
  SOPHISTICATION_LEVELS,
  COPY_LOADING_MESSAGES, COPY_LOADING_MESSAGES_BN,
} from './types';
import { getImageHistory } from './AdGeneratorPage';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook size={14} />,
  instagram: <Instagram size={14} />,
  daraz: <ShoppingBag size={14} />,
  google: <Search size={14} />,
  tiktok: <Sparkles size={14} />,
  email: <Mail size={14} />,
  sales_page: <FileText size={14} />,
  whatsapp: <Phone size={14} />,
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

// Tooltip helper for advanced fields
const FieldTooltip = ({ text }: { text: string }) => (
  <OnceTooltip id={`field_${text.slice(0, 20)}`} content={text} side="top" className="bg-foreground text-background text-[11px] font-heading-bn max-w-[250px]">
    <button type="button" className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
      <HelpCircle size={13} />
    </button>
  </OnceTooltip>
);

const InputPanel = ({ mode, setMode, form, setForm, onGenerate, generating, onToggleImageHistory, generateBtnRef }: InputPanelProps) => {
  const { t, lang } = useLanguage();
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const historyCount = useMemo(() => getImageHistory().length, []);

  // Two-step prompt flow for image mode
  const [imageStep, setImageStep] = useState<1 | 2>(1);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageDefaultPrompt, setImageDefaultPrompt] = useState('');

  // Copy mode: advanced section toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  const copyLoadingTexts = lang === 'bn' ? COPY_LOADING_MESSAGES_BN : COPY_LOADING_MESSAGES;
  const imageLoadingTexts = [t('প্রম্পট তৈরি হচ্ছে...', 'Creating prompt...'), t('AI ছবি আঁকছে...', 'AI drawing...'), t('ফিনিশিং টাচ...', 'Finishing touches...')];
  const loadingTexts = mode === 'copy' ? copyLoadingTexts : imageLoadingTexts;

  // Cycle loading text
  useState(() => {
    const interval = setInterval(() => setLoadingTextIdx(i => (i + 1) % loadingTexts.length), 2000);
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
    if (!file.type.startsWith('image/')) return;
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
    if (file && file.type.startsWith('image/')) {
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
    } else {
      updateField('imageStyle', style);
    }
  };

  const AWARENESS_ICONS: Record<string, React.ReactNode> = {
    seedling: <Sprout size={16} />,
    frown: <Frown size={16} />,
    search: <Search size={16} />,
    thinking: <Eye size={16} />,
    check: <CheckCircle size={16} />,
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

        {/* ── COPY MODE: Copy That! Framework ── */}
        {mode === 'copy' && (
          <>
            {/* Header */}
            <div>
              <h3 className="text-base font-bold font-heading-bn text-foreground">{t('আপনার বিজ্ঞাপন লিখুন', 'Write Your Ad')}</h3>
              <p className="text-xs text-muted-foreground font-heading-bn mt-0.5">
                {t('এখানে শুরু করুন। আরো তথ্য দিলে কপি আরো ভালো হবে।', 'Start here. Add more detail for sharper copy.')}
              </p>
            </div>

            {/* Product/Service */}
            <FieldGroup label={t('আপনি কী বিক্রি করছেন?', 'What are you selling?')} required>
              <textarea
                value={form.productDesc}
                onChange={e => updateField('productDesc', e.target.value)}
                rows={3}
                placeholder={t(
                  'আপনার পণ্য বর্ণনা করুন — এটি কী, কী করে, কীভাবে আলাদা।',
                  'Describe your product — what it is, what it does, what makes it different.'
                )}
                className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-none"
              />
            </FieldGroup>

            {/* Platform */}
            <FieldGroup label={t('প্ল্যাটফর্ম', 'Platform')}>
              <div className="flex flex-wrap gap-2">
                {COPY_PLATFORMS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => updateField('platforms', [p.value])}
                    className={`px-3.5 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
                      form.platforms[0] === p.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-card text-foreground hover:border-primary/40'
                    }`}
                  >
                    {PLATFORM_ICONS[p.value]} {p.label}
                  </button>
                ))}
              </div>
            </FieldGroup>

            {/* Language */}
            <FieldGroup label={t('ভাষা', 'Language')}>
              <div className="flex gap-2">
                {COPY_LANGUAGES.map(l => (
                  <button
                    key={l.value}
                    onClick={() => updateField('language', l.value)}
                    className={`px-4 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 ${
                      form.language === l.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-card text-foreground hover:border-primary/40'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </FieldGroup>

            {/* Tone */}
            <FieldGroup label={t('টোন', 'Tone')}>
              <div className="flex flex-wrap gap-2">
                {COPY_TONES.map(tn => (
                  <button
                    key={tn.value}
                    onClick={() => updateField('tone', tn.value)}
                    className={`px-3.5 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 ${
                      form.tone === tn.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-card text-foreground hover:border-primary/40'
                    }`}
                  >
                    {t(tn.labelBn, tn.label)}
                  </button>
                ))}
              </div>
            </FieldGroup>

            {/* Variations */}
            <FieldGroup label={t('ভেরিয়েশন', 'Variations')}>
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    onClick={() => updateField('numVariations', n)}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all duration-150 active:scale-95 ${
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

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[13px] text-primary hover:text-primary/80 font-heading-bn transition-colors flex items-center gap-1"
            >
              {showAdvanced
                ? t('← বেসিকে ফিরুন', '← Back to Basic')
                : t('আরো তথ্য দিলে কপি ভালো হবে ↓', 'Want sharper copy? Add more detail ↓')}
              {!showAdvanced && <ChevronDown size={14} />}
            </button>

            {/* ── ADVANCED SECTION ── */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-5 pt-2">
                    <div>
                      <h3 className="text-base font-bold font-heading-bn text-foreground">{t('কপিরাইটারকে ব্রিফ দিন', 'Brief Your Copywriter')}</h3>
                      <p className="text-xs text-muted-foreground font-heading-bn mt-0.5">
                        {t('যত বেশি পূরণ করবেন, তত ভালো বিজ্ঞাপন। যা জানেন না সেটা ছেড়ে দিন।', 'The more you fill in, the better your ads. Skip anything you don\'t know.')}
                      </p>
                    </div>

                    {/* Target Reader */}
                    <FieldGroup label={<>{t('আপনার কাস্টমার কে?', 'Who is your customer?')}<FieldTooltip text={t('একজন নির্দিষ্ট মানুষের ছবি মনে আনুন যিনি এটি কিনবেন। যত নির্দিষ্ট, তত ভালো।', 'Picture one specific person who would buy this. The more specific, the better.')} /></>}>
                      <textarea
                        value={form.targetReader}
                        onChange={e => updateField('targetReader', e.target.value)}
                        rows={3}
                        placeholder={t(
                          'উদাহরণ: ঢাকায় থাকা ২৮ বছরের একজন নারী যিনি ঘর থেকে ছোট কাপড়ের ব্যবসা চালান...',
                          'Example: A 28-year-old woman in Dhaka who runs a small clothing business from home...'
                        )}
                        className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-none"
                      />
                    </FieldGroup>

                    {/* Awareness Stage */}
                    <FieldGroup label={<>{t('আপনার কাস্টমার কতটুকু জানে?', 'How much does your customer know?')}<FieldTooltip text={t('এটি AI কে বলে দেয় কাস্টমারের কাছে কীভাবে যেতে হবে।', 'This tells the AI how to approach your customer.')} /></>}>
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                        {AWARENESS_STAGES.map(s => (
                          <button
                            key={s.value}
                            onClick={() => updateField('awarenessStage', s.value)}
                            className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-[1.5px] text-center transition-all duration-150 active:scale-95 min-w-[100px] ${
                              form.awarenessStage === s.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-input bg-card text-foreground hover:border-primary/40'
                            }`}
                          >
                            <span className="text-lg">{AWARENESS_ICONS[s.icon]}</span>
                            <span className="text-[11px] font-semibold font-heading-bn leading-tight">{t(s.labelBn, s.label)}</span>
                            <span className="text-[10px] text-muted-foreground font-heading-bn leading-tight">{t(s.descBn, s.desc)}</span>
                          </button>
                        ))}
                      </div>
                    </FieldGroup>

                    {/* Sophistication */}
                    <FieldGroup label={<>{t('কতগুলো একই রকম বিজ্ঞাপন দেখেছে?', 'How many similar ads seen?')}<FieldTooltip text={t('যদি বাজারে সব প্রতিশ্রুতি দেখা হয়ে গেছে, AI নতুন কোণ খুঁজবে।', 'If your market has seen every promise, the AI will find a fresh angle.')} /></>}>
                      <div className="flex flex-wrap gap-2">
                        {SOPHISTICATION_LEVELS.map(s => (
                          <button
                            key={s.value}
                            onClick={() => updateField('sophistication', s.value)}
                            className={`px-3.5 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 ${
                              form.sophistication === s.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-input bg-card text-foreground hover:border-primary/40'
                            }`}
                          >
                            {t(s.labelBn, s.label)}
                          </button>
                        ))}
                      </div>
                    </FieldGroup>

                    {/* One Idea */}
                    <FieldGroup label={<>{t('একটি কারণ কেন কিনবে?', "What's the ONE reason to buy?")}<FieldTooltip text={t('সুবিধার তালিকা নয় — শুধু সবচেয়ে শক্তিশালী যুক্তি। AI এটিকে কেন্দ্র করে সব তৈরি করবে।', 'Not a list — just the single strongest argument. AI builds everything around this.')} /></>}>
                      <textarea
                        value={form.oneIdea}
                        onChange={e => updateField('oneIdea', e.target.value)}
                        rows={2}
                        placeholder={t(
                          'উদাহরণ: অন্য প্রোটিন পাউডারগুলো চক এর মতো স্বাদ — এটা আসলেই চকলেট মিল্কশেকের মতো...',
                          'Example: Unlike other protein powders that taste like chalk, this one actually tastes like a chocolate milkshake...'
                        )}
                        className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-none"
                      />
                    </FieldGroup>

                    {/* Desires */}
                    <FieldGroup label={<>{t('গোপনে কী চায়?', 'What do they secretly want?')}<FieldTooltip text={t('"আমি এই পণ্য চাই" নয় — আসলে ভেতরে কী চায়? স্ট্যাটাস? সময়? আত্মবিশ্বাস?', 'Not "I want this product" — what do they REALLY want? Status? Time? Confidence?')} /></>}>
                      <textarea
                        value={form.desires}
                        onChange={e => updateField('desires', e.target.value)}
                        rows={2}
                        placeholder={t(
                          'উদাহরণ: তারা চায় সিরিয়াস, প্রফেশনাল ব্যবসায়ী হিসেবে দেখতে — শুধু ফোন থেকে বিক্রি করা কেউ না।',
                          'Example: They want to feel like a serious, professional business owner — not just someone selling from their phone.'
                        )}
                        className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-none"
                      />
                    </FieldGroup>

                    {/* Notions / Beliefs */}
                    <FieldGroup label={<>{t('কী তাদের থামাবে?', 'What will make them hesitate?')}<FieldTooltip text={t('কেনার আগে কাস্টমার কী ভাববে? কোন সন্দেহ বা অজুহাত থামাবে?', 'What will your customer think BEFORE buying? What doubts hold them back?')} /></>}>
                      <textarea
                        value={form.notions}
                        onChange={e => updateField('notions', e.target.value)}
                        rows={2}
                        placeholder={t(
                          'উদাহরণ: "এটা হয়তো দামি।" "আমার জন্য কাজ করবে না।" "আগেও চেষ্টা করেছি।"',
                          'Example: "This is probably too expensive." "It won\'t work for me." "I\'ve tried things like this."'
                        )}
                        className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-none"
                      />
                    </FieldGroup>

                    {/* Identification / Tribe */}
                    <FieldGroup label={<>{t('কোন গ্রুপের মানুষ?', 'What group do they belong to?')}<FieldTooltip text={t('কোন লেবেল নিয়ে তারা গর্বিত? AI এটি ব্যবহার করে বিজ্ঞাপন তাদের জন্য তৈরি করবে।', 'What label do they wear with pride? AI uses this to make ads feel custom.')} /></>}>
                      <input
                        type="text"
                        value={form.identification}
                        onChange={e => updateField('identification', e.target.value)}
                        placeholder={t(
                          'উদাহরণ: ছোট ব্যবসার মালিক, নতুন মা, ফিটনেস বিগিনার...',
                          'Example: Small business owners, new moms, fitness beginners...'
                        )}
                        className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
                      />
                    </FieldGroup>

                    {/* The Offer */}
                    <FieldGroup label={<>{t('ঠিক কী অফার?', 'What exactly are you offering?')}<FieldTooltip text={t('কী পাচ্ছে, কত দাম, ডিসকাউন্ট আছে কি, গ্যারান্টি আছে কি? যত সম্পূর্ণ, তত শক্তিশালী।', 'What do they get, cost, discount, guarantee? The more complete, the stronger.')} /></>}>
                      <textarea
                        value={form.offer}
                        onChange={e => updateField('offer', e.target.value)}
                        rows={3}
                        placeholder={t(
                          'উদাহরণ: ফুল স্কিনকেয়ার কিট (ক্লিনজার + সেরাম + ময়েশ্চারাইজার), সাধারণত ৳২,৪০০, এখন ৳১,৬৯৯...',
                          'Example: The full skincare kit, normally ৳2,400, now ৳1,699 until Sunday. Free delivery. 7-day guarantee.'
                        )}
                        className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-none"
                      />
                    </FieldGroup>

                    {/* One Action */}
                    <FieldGroup label={<>{t('কী করতে হবে?', 'What should they do?')}<FieldTooltip text={t('একটি মাত্র পরবর্তী পদক্ষেপ। কোনো বিকল্প নয়।', 'One next step only. No alternatives.')} /></>}>
                      <input
                        type="text"
                        value={form.oneAction}
                        onChange={e => updateField('oneAction', e.target.value)}
                        placeholder={t(
                          'উদাহরণ: Facebook এ মেসেজ করুন / লিংকে ক্লিক করুন / এখনই কল করুন',
                          'Example: Message us on Facebook / Click the link / Call now'
                        )}
                        className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
                      />
                    </FieldGroup>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
            <FieldGroup label={t('পণ্যের ছবি', 'Product Image')} required>
              {form.productImagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={form.productImagePreview} alt="Product" className="w-full h-48 object-contain bg-secondary" />
                  <button
                    onClick={() => { updateField('productImage', null); updateField('productImagePreview', null); }}
                    className="absolute top-2 right-2 w-7 h-7 bg-background/80 rounded-full flex items-center justify-center text-foreground hover:bg-background transition-colors"
                  >×</button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                    dragOver ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/40'
                  }`}
                >
                  <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-heading-bn text-foreground">{t('ক্লিক করুন বা ড্র্যাগ করুন', 'Click or drag to upload')}</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · Max 5MB</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            </FieldGroup>

            {/* Scene Style */}
            <FieldGroup label={t('দৃশ্য স্টাইল', 'Scene Style')}>
              <div className="grid grid-cols-2 gap-2">
                {IMAGE_STYLES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => handleStyleChange(s.value)}
                    className={`px-3 py-2 rounded-xl border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5 ${
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

            {/* Image Format */}
            <FieldGroup label={t('ফর্ম্যাট', 'Format')}>
              <div className="flex gap-2">
                {IMAGE_FORMATS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => updateField('imageFormat', f.value)}
                    className={`flex-1 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5 ${
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

            {/* Visual Controls */}
            <VisualPillGroup label={t('আলো', 'Lighting')} options={LIGHTING_OPTIONS} value={form.lightingMood} onChange={v => updateField('lightingMood', v as any)} t={t} />
            <VisualPillGroup label={t('রঙের ধরন', 'Color Mood')} options={COLOR_MOOD_OPTIONS} value={form.colorMood} onChange={v => updateField('colorMood', v as any)} t={t} />
            <VisualPillGroup label={t('ক্যামেরা অ্যাঙ্গেল', 'Camera Angle')} options={CAMERA_ANGLE_OPTIONS} value={form.cameraAngle} onChange={v => updateField('cameraAngle', v as any)} t={t} />
            <VisualPillGroup label={t('ব্যাকগ্রাউন্ড', 'Background')} options={BACKGROUND_OPTIONS} value={form.backgroundComplexity} onChange={v => updateField('backgroundComplexity', v as any)} t={t} />
            <VisualPillGroup label={t('সময়', 'Time of Day')} options={TIME_OF_DAY_OPTIONS} value={form.timeOfDay} onChange={v => updateField('timeOfDay', v as any)} t={t} />
            <VisualPillGroup label={t('পণ্যের ফোকাস', 'Product Focus')} options={PRODUCT_FOCUS_OPTIONS} value={form.productFocus} onChange={v => updateField('productFocus', v as any)} t={t} />

            {/* Num Variations */}
            <FieldGroup label={t('কতগুলো ভার্শন?', 'How many variations?')}>
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
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
          </div>
        )}

        {/* IMAGE MODE — Step 2: Prompt Editor */}
        {mode === 'image' && imageStep === 2 && (
          <PromptEditor
            prompt={imagePrompt}
            onPromptChange={setImagePrompt}
            defaultPrompt={imageDefaultPrompt}
            onGenerate={() => onGenerate(imagePrompt)}
            onBack={() => setImageStep(1)}
            generating={generating}
            generateLabel={t('ইমেজ তৈরি করুন', 'Generate Image')}
            generateIcon={<Sparkles size={18} />}
            tabType="ad_image"
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
            disabled={generating || !form.productDesc.trim()}
            className={`w-full h-[52px] rounded-[14px] font-bold text-[17px] font-heading-bn text-primary-foreground transition-all duration-200 ${
              generating || !form.productDesc.trim()
                ? 'bg-primary/50 cursor-not-allowed opacity-60'
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
                <PenLine size={18} /> {t('বিজ্ঞাপন তৈরি করুন', 'Generate Ad')} →
              </span>
            )}
          </button>
        )}
        {mode !== 'image' || imageStep !== 2 ? (
          <p className="text-center text-[11px] text-muted-foreground mt-2 font-heading-bn">
            {mode === 'copy'
              ? t('ভিডিও ৮-১৫ সেকেন্ডে তৈরি হয়', 'Usually takes 8-15 seconds')
              : t('সাধারণত ৮-১৫ সেকেন্ড লাগে', 'Usually takes 8-15 seconds')}
          </p>
        ) : null}
      </div>
    </div>
  );
};

const FieldGroup = ({ label, required, children }: { label: React.ReactNode; required?: boolean; children: React.ReactNode }) => (
  <div>
    <label className="block text-[13px] font-semibold font-heading-bn text-foreground mb-1.5">
      {label} {required && <span className="text-primary">*</span>}
    </label>
    {children}
  </div>
);

export default InputPanel;
