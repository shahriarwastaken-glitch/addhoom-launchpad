import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import TemplatesBrowser from './TemplatesBrowser';
import { buildAdImagePrompts } from './imagePromptClient';
import OnceTooltip from '@/components/ui/OnceTooltip';
import CreditCostLabel from '@/components/ui/CreditCostLabel';
import {
  PenLine, ImageIcon, Facebook, Instagram, ShoppingBag, Search,
  Target, Sparkles, Upload, Rocket, History, LayoutTemplate,
  ArrowRight, ChevronDown, HelpCircle, Sprout, Frown,
  Eye, CheckCircle, Mail, FileText, Phone, Home,
  ArrowLeft,
} from 'lucide-react';
import StepIndicator from '@/components/dashboard/studio/StepIndicator';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
  GeneratorMode, GeneratorFormData,
  COPY_PLATFORMS, COPY_LANGUAGES, COPY_TONES, AWARENESS_STAGES,
  SOPHISTICATION_LEVELS,
  COPY_LOADING_MESSAGES, COPY_LOADING_MESSAGES_BN,
  IMAGE_LIGHTING_OPTIONS, IMAGE_CAMERA_OPTIONS, SCENE_OPTIONS,
  type SceneKey,
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

const SCENE_ICONS: Record<string, React.ReactNode> = {
  target: <Target size={18} />,
  home: <Home size={18} />,
  sparkles: <Sparkles size={18} />,
};

interface InputPanelProps {
  mode: GeneratorMode;
  setMode: (m: GeneratorMode) => void;
  form: GeneratorFormData;
  setForm: (fn: (prev: GeneratorFormData) => GeneratorFormData) => void;
  onGenerate: (prompts?: Record<string, string>) => void;
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
  const [scenePrompts, setScenePrompts] = useState<Record<string, string>>({});
  const [defaultScenePrompts, setDefaultScenePrompts] = useState<Record<string, string>>({});
  const [imageSubTab, setImageSubTab] = useState<'write' | 'templates'>('write');

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

  const toggleScene = (scene: SceneKey) => {
    setForm(prev => {
      const current = prev.selectedScenes;
      if (current.includes(scene)) {
        if (current.length <= 1) return prev; // at least 1
        return { ...prev, selectedScenes: current.filter(s => s !== scene) };
      }
      return { ...prev, selectedScenes: [...current, scene] };
    });
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

  const buildPrompts = () => {
    // Import dynamically to avoid circular deps
    const { buildAdImagePrompts } = require('./imagePromptClient');
    return buildAdImagePrompts({
      productName: form.productName || 'the product',
      lightingMood: form.lightingMood,
      cameraAngle: form.cameraAngle,
      additionalDetails: form.additionalDetails || undefined,
      selectedScenes: form.selectedScenes,
    });
  };

  const handleContinueToPrompt = () => {
    const prompts = buildPrompts();
    setDefaultScenePrompts(prompts);
    setScenePrompts(prompts);
    setImageStep(2);
  };

  const handleResetPrompts = () => {
    const prompts = buildPrompts();
    setDefaultScenePrompts(prompts);
    setScenePrompts(prompts);
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
              onClick={() => { setMode(m); setImageStep(1); }}
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
                    <FieldGroup label={<>{t('আপনার কাস্টমার কতটুকু জানে?', 'How much does your customer know?')}<FieldTooltip text={t('এটি AI-কে বলে দেয় কীভাবে আপনার কাস্টমারকে approach করতে হবে।', 'This tells the AI how to approach your customer.')} /></>}>
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
                        {AWARENESS_STAGES.map(a => (
                          <button
                            key={a.value}
                            onClick={() => updateField('awarenessStage', a.value)}
                            className={`snap-start flex-shrink-0 w-[130px] rounded-xl border-[1.5px] p-3 text-left transition-all duration-150 active:scale-95 ${
                              form.awarenessStage === a.value
                                ? 'border-primary bg-primary/[0.06]'
                                : 'border-input bg-card hover:border-primary/30'
                            }`}
                          >
                            <span className={`mb-1 block ${form.awarenessStage === a.value ? 'text-primary' : 'text-muted-foreground'}`}>
                              {AWARENESS_ICONS[a.icon]}
                            </span>
                            <p className="text-[12px] font-bold font-heading-bn text-foreground leading-tight">{t(a.labelBn, a.label)}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t(a.descBn, a.desc)}</p>
                          </button>
                        ))}
                      </div>
                    </FieldGroup>

                    {/* Market Sophistication */}
                    <FieldGroup label={<>{t('বাজারে কতটা প্রতিযোগিতা?', 'How competitive is the market?')}<FieldTooltip text={t('আপনার কাস্টমার কতগুলো একই রকম বিজ্ঞাপন দেখেছে? AI একটা ফ্রেশ এঙ্গেল খুঁজবে।', 'How many similar ads has your customer seen? AI will find a fresh angle.')} /></>}>
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
                    <FieldGroup label={<>{t('মূল কারণ কী?', "What's the ONE reason to buy?")}<FieldTooltip text={t('বেনিফিটের লিস্ট না — শুধু একটাই সবচেয়ে শক্তিশালী আর্গুমেন্ট।', 'Not a list of benefits — just the single strongest argument.')} /></>}>
                      <textarea
                        value={form.oneIdea}
                        onChange={e => updateField('oneIdea', e.target.value)}
                        rows={2}
                        placeholder={t(
                          'উদাহরণ: অন্য প্রোটিন পাউডারের মতো চকের স্বাদ না, এটা আসলেই চকলেট মিল্কশেকের মতো...',
                          'Example: Unlike other protein powders that taste like chalk, this one actually tastes like a chocolate milkshake...'
                        )}
                        className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-none"
                      />
                    </FieldGroup>

                    {/* Desires */}
                    <FieldGroup label={<>{t('তারা আসলে কী চায়?', 'What does your customer secretly want?')}<FieldTooltip text={t("শুধু 'এই পণ্য চাই' না — ভিতরে আসলে কী চায়? স্ট্যাটাস? সময়?", "Not just 'I want this product' — what do they REALLY want? Status? Time?")} /></>}>
                      <textarea
                        value={form.desires}
                        onChange={e => updateField('desires', e.target.value)}
                        rows={2}
                        placeholder={t(
                          'উদাহরণ: তারা একজন সিরিয়াস, প্রফেশনাল বিজনেস ওনার মনে হতে চায়...',
                          'Example: They want to feel like a serious, professional business owner...'
                        )}
                        className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-none"
                      />
                    </FieldGroup>

                    {/* Notions/Beliefs */}
                    <FieldGroup label={<>{t('কী তাদের থামাবে?', 'What will make them hesitate?')}<FieldTooltip text={t('কেনার আগে তারা কী ভাববে? কোন সন্দেহ বা অজুহাত থাকবে?', 'What doubts or excuses will hold them back?')} /></>}>
                      <textarea
                        value={form.notions}
                        onChange={e => updateField('notions', e.target.value)}
                        rows={2}
                        placeholder={t(
                          "উদাহরণ: 'এটা নিশ্চয়ই বেশি দামি।' 'আমার জন্য কাজ করবে না।'",
                          "Example: 'This is probably too expensive.' 'It won't work for me.'"
                        )}
                        className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-none"
                      />
                    </FieldGroup>

                    {/* Identification / Tribe */}
                    <FieldGroup label={<>{t('তারা কোন গ্রুপের?', 'What group do they belong to?')}<FieldTooltip text={t('তারা কোন লেবেল গর্বের সাথে পরে? AI এটি ব্যবহার করবে।', "What label do they wear with pride? AI will use this.")} /></>}>
                      <input
                        value={form.identification}
                        onChange={e => updateField('identification', e.target.value)}
                        placeholder={t(
                          'উদাহরণ: ছোট ব্যবসার মালিক, নতুন মা, ফিটনেস বিগিনার...',
                          'Example: Small business owners, new moms, fitness beginners...'
                        )}
                        className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
                      />
                    </FieldGroup>

                    {/* Offer */}
                    <FieldGroup label={<>{t('অফার কী?', 'What exactly are you offering?')}<FieldTooltip text={t('তারা কী পাবে, দাম কত, ডিসকাউন্ট আছে, গ্যারান্টি?', 'What do they get, cost, discount, guarantee?')} /></>}>
                      <textarea
                        value={form.offer}
                        onChange={e => updateField('offer', e.target.value)}
                        rows={3}
                        placeholder={t(
                          'উদাহরণ: ফুল স্কিনকেয়ার কিট, সাধারণত ৳২,৪০০, এখন ৳১,৬৯৯...',
                          'Example: The full skincare kit, normally ৳2,400, now ৳1,699...'
                        )}
                        className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-none"
                      />
                    </FieldGroup>

                    {/* One Action */}
                    <FieldGroup label={<>{t('তাদের কী করতে হবে?', 'What should they do?')}<FieldTooltip text={t('একটাই পরবর্তী পদক্ষেপ। কোনো বিকল্প না।', 'One action. No alternatives.')} /></>}>
                      <input
                        value={form.oneAction}
                        onChange={e => updateField('oneAction', e.target.value)}
                        placeholder={t(
                          'উদাহরণ: Facebook এ মেসেজ করুন / লিংকে ক্লিক করুন',
                          'Example: Message us on Facebook / Click the link below'
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

        {/* ── IMAGE MODE — Step 1: Controls ── */}
        {mode === 'image' && imageStep === 1 && (
          <div className="space-y-5">
            {/* Product Name */}
            <FieldGroup label={t('পণ্যের নাম', 'Product Name')} required>
              <input
                value={form.productName}
                onChange={e => updateField('productName', e.target.value)}
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
                <label
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 block ${
                    dragOver ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/40'
                  }`}
                >
                  <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-heading-bn text-foreground">{t('ক্লিক করুন বা ড্র্যাগ করুন', 'Click or drag to upload')}</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · Max 5MB</p>
                  <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) { handleFileSelect(e.target.files[0]); } e.target.value = ''; }} />
                </label>
              )}
            </FieldGroup>

            {/* Lighting */}
            <VisualPillGroup label={t('আলো', 'Lighting')} options={IMAGE_LIGHTING_OPTIONS} value={form.lightingMood} onChange={v => updateField('lightingMood', v as any)} t={t} />

            {/* Camera Angle */}
            <VisualPillGroup label={t('ক্যামেরা অ্যাঙ্গেল', 'Camera Angle')} options={IMAGE_CAMERA_OPTIONS} value={form.cameraAngle} onChange={v => updateField('cameraAngle', v as any)} t={t} />

            {/* Additional Details */}
            <FieldGroup label={t('অতিরিক্ত তথ্য (ঐচ্ছিক)', 'Additional details (optional)')}>
              <input
                value={form.additionalDetails}
                onChange={e => updateField('additionalDetails', e.target.value)}
                placeholder={t(
                  'ম্যাটেরিয়াল, রঙ, টেক্সচার, বিশেষ ফিচার, মুড...',
                  'Material, color, texture, special features, mood...'
                )}
                className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
              />
            </FieldGroup>

            {/* Scene Selector */}
            <FieldGroup label={t('সিন বেছে নিন', 'Choose scenes')}>
              <p className="text-[11px] text-muted-foreground font-heading-bn -mt-1 mb-2">{t('এক বা একাধিক নির্বাচন করুন', 'Select one or more')}</p>
              <div className="grid grid-cols-3 gap-2">
                {SCENE_OPTIONS.map(scene => {
                  const isSelected = form.selectedScenes.includes(scene.value);
                  return (
                    <button
                      key={scene.value}
                      onClick={() => toggleScene(scene.value)}
                      className={`rounded-xl border-[1.5px] p-3 text-center transition-all duration-150 active:scale-95 ${
                        isSelected
                          ? 'border-primary bg-primary/[0.04]'
                          : 'border-input bg-card hover:border-primary/30'
                      }`}
                    >
                      <span className={`block mb-1.5 mx-auto ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                        {SCENE_ICONS[scene.icon]}
                      </span>
                      <p className="text-[13px] font-bold font-heading-bn text-foreground">{t(scene.labelBn, scene.label)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t(scene.descBn, scene.desc)}</p>
                    </button>
                  );
                })}
              </div>
              {/* Image count indicator */}
              <p className="text-[12px] text-muted-foreground font-heading-bn mt-2">
                {form.selectedScenes.length === 1
                  ? t('১টি ইমেজ তৈরি হবে', '1 image will be generated')
                  : t(`${toBengali(form.selectedScenes.length)}টি ইমেজ তৈরি হবে`, `${form.selectedScenes.length} images will be generated`)}
              </p>
            </FieldGroup>
          </div>
        )}

        {/* IMAGE MODE — Step 2: Write/Templates Toggle + Content */}
        {mode === 'image' && imageStep === 2 && (
          <div className="space-y-5">
            {/* Write / Templates sub-tab toggle */}
            <div className="bg-secondary rounded-xl p-1 flex">
              {(['write', 'templates'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setImageSubTab(tab)}
                  className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold font-heading-bn transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    imageSubTab === tab
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'write'
                    ? <><PenLine size={14} /> {t('লিখুন', 'Write')}</>
                    : <><LayoutTemplate size={14} /> {t('টেমপ্লেট', 'Templates')}</>}
                </button>
              ))}
            </div>

            {/* Templates sub-tab */}
            {imageSubTab === 'templates' && (
              <TemplatesBrowser
                onSelectTemplate={(filledPrompt, aspectRatio) => {
                  // Set the prompt into the first scene's prompt area
                  const firstScene = form.selectedScenes[0] || 'studio';
                  setScenePrompts(prev => ({ ...prev, [firstScene]: filledPrompt }));
                  setImageSubTab('write');
                }}
              />
            )}

            {/* Write sub-tab (existing prompt editor) */}
            {imageSubTab === 'write' && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold font-heading-bn text-foreground">{t('আপনার ইমেজ প্রম্পট', 'Your Image Prompt')}</h3>
                    <p className="text-[11px] text-muted-foreground font-heading-bn mt-0.5">
                      {t('এগুলো AI-তে যাবে। ইচ্ছামতো এডিট করুন।', 'These are exactly what gets sent to the AI. Edit freely for more control.')}
                    </p>
                  </div>
                  <button
                    onClick={handleResetPrompts}
                    className="text-xs text-muted-foreground hover:text-primary font-heading-bn transition-colors"
                  >
                    {t('রিসেট ↺', 'Reset to defaults ↺')}
                  </button>
                </div>

                {form.selectedScenes.map(sceneKey => {
                  const sceneInfo = SCENE_OPTIONS.find(s => s.value === sceneKey);
                  const sceneBadgeStyles: Record<SceneKey, { bg: string; text: string }> = {
                    studio: { bg: 'hsl(var(--muted))', text: 'hsl(var(--muted-foreground))' },
                    lifestyle: { bg: 'hsl(var(--primary) / 0.1)', text: 'hsl(var(--primary))' },
                    luxury: { bg: 'hsl(var(--foreground))', text: 'hsl(var(--background))' },
                  };
                  const badge = sceneBadgeStyles[sceneKey];
                  return (
                    <div key={sceneKey}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-heading-bn inline-flex items-center gap-1"
                          style={{ backgroundColor: badge.bg, color: badge.text }}
                        >
                          {SCENE_ICONS[sceneInfo?.icon || 'target']} {t(sceneInfo?.labelBn || '', sceneInfo?.label || '')}
                        </span>
                      </div>
                      <textarea
                        value={scenePrompts[sceneKey] || ''}
                        onChange={e => setScenePrompts(prev => ({ ...prev, [sceneKey]: e.target.value }))}
                        className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[13px] font-mono text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-y min-h-[160px]"
                      />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Spacer for sticky button */}
        <div className="h-20" />
      </div>

      {/* Sticky Generate/Continue Button */}
      <div className="sticky bottom-0 bg-gradient-to-t from-card via-card to-transparent px-6 lg:px-7 pb-5 pt-4">
        {mode === 'image' && imageStep === 1 ? (
          <button
            onClick={handleContinueToPrompt}
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
          <div className="space-y-2">
            <button
              onClick={() => onGenerate(scenePrompts)}
              disabled={generating}
              className={`w-full h-[52px] rounded-[14px] font-bold text-[17px] font-heading-bn text-primary-foreground transition-all duration-200 ${
                generating
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
                  <Sparkles size={18} /> {t('ইমেজ তৈরি করুন', 'Generate Images')} →
                </span>
              )}
            </button>
            <p className="text-center">
              <CreditCostLabel credits={125 * form.selectedScenes.length} />
            </p>
            <button
              onClick={() => setImageStep(1)}
              className="w-full text-center text-[13px] text-muted-foreground hover:text-primary font-heading-bn transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft size={13} /> {t('পেছনে যান', 'Back')}
            </button>
          </div>
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
        {mode !== 'image' || imageStep === 1 ? (
          <p className="text-center text-[11px] text-muted-foreground mt-2 font-heading-bn">
            {mode === 'copy'
              ? <CreditCostLabel credits={10} />
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
