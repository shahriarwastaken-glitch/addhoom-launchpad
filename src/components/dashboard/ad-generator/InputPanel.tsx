import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GeneratorMode, GeneratorFormData, PLATFORMS, FRAMEWORKS,
  OCCASIONS, TONES, IMAGE_FORMATS, IMAGE_STYLES,
} from './types';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

interface InputPanelProps {
  mode: GeneratorMode;
  setMode: (m: GeneratorMode) => void;
  form: GeneratorFormData;
  setForm: (fn: (prev: GeneratorFormData) => GeneratorFormData) => void;
  onGenerate: () => void;
  generating: boolean;
}

const InputPanel = ({ mode, setMode, form, setForm, onGenerate, generating }: InputPanelProps) => {
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const copyLoadingTexts = ['চিন্তা করছি...', 'লিখছি...', 'স্কোর করছি...'];
  const imageLoadingTexts = ['প্রম্পট তৈরি হচ্ছে...', 'AI ছবি আঁকছে...', 'ফিনিশিং টাচ...'];
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

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="flex-1 overflow-y-auto p-6 lg:p-7 space-y-5">
        {/* Header */}
        <h2 className="text-xl font-bold font-heading-bn text-foreground">বিজ্ঞাপন তৈরি করুন</h2>

        {/* Mode toggle */}
        <div className="bg-secondary rounded-xl p-1 flex">
          {(['copy', 'image'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold font-heading-bn transition-all duration-200 ${
                mode === m
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'copy' ? '✍️ কপি জেনারেটর' : '🖼️ ইমেজ জেনারেটর'}
            </button>
          ))}
        </div>

        {/* Product Name */}
        <FieldGroup label="পণ্যের নাম" required>
          <input
            type="text"
            value={form.productName}
            onChange={e => updateField('productName', e.target.value)}
            maxLength={100}
            placeholder="যেমন: হ্যান্ডব্যাগ, স্মার্টফোন, শাড়ি..."
            className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
          />
        </FieldGroup>

        {/* Description */}
        <FieldGroup label="পণ্যের বিবরণ">
          <div className="relative">
            <textarea
              value={form.productDesc}
              onChange={e => updateField('productDesc', e.target.value.slice(0, 500))}
              rows={3}
              placeholder="পণ্যের বৈশিষ্ট্য, উপকরণ, সুবিধা লিখুন...&#10;যত বেশি তথ্য দেবেন, বিজ্ঞাপন তত ভালো হবে।"
              className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-none"
            />
            <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground">
              {form.productDesc.length}/৫০০
            </span>
          </div>
        </FieldGroup>

        {/* Price */}
        <FieldGroup label="মূল্য (ঐচ্ছিক)">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-muted-foreground font-heading-bn">৳</span>
            <input
              type="text"
              value={form.price}
              onChange={e => updateField('price', e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="৯৯৯"
              className="w-full rounded-xl border-[1.5px] border-input bg-card pl-7 pr-4 py-3 text-[15px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
            />
          </div>
        </FieldGroup>

        {/* Platforms */}
        <FieldGroup label="কোন প্ল্যাটফর্মের জন্য?" required>
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
                  <span>{p.emoji}</span> {p.label}
                </button>
              );
            })}
          </div>
        </FieldGroup>

        {/* Language */}
        <FieldGroup label="ভাষা">
          <div className="flex gap-2">
            {[
              { label: '🇧🇩 বাংলা', value: 'bn' as const },
              { label: '🔤 Banglish', value: 'banglish' as const },
            ].map(l => (
              <button
                key={l.value}
                onClick={() => updateField('language', l.value)}
                className={`flex-1 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 ${
                  form.language === l.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-card text-foreground'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </FieldGroup>

        {/* Framework */}
        <FieldGroup label="বিজ্ঞাপনের কৌশল (Framework)">
          <div className="grid grid-cols-2 gap-2">
            {FRAMEWORKS.map(f => (
              <Tooltip key={f.value}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => updateField('framework', f.value)}
                    className={`px-3 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 ${
                      form.framework === f.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-card text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-foreground text-background text-[11px] font-heading-bn">
                  {f.tooltip}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </FieldGroup>

        {/* Occasion */}
        <FieldGroup label="উপলক্ষ (Occasion)">
          <Select value={form.occasion} onValueChange={v => updateField('occasion', v)}>
            <SelectTrigger className="rounded-xl border-[1.5px] border-input h-11 font-heading-bn text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OCCASIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="font-heading-bn">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldGroup>

        {/* Tone */}
        <FieldGroup label="টোন">
          <div className="flex gap-2">
            {TONES.map(t => (
              <button
                key={t.value}
                onClick={() => updateField('tone', t.value)}
                className={`flex-1 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 ${
                  form.tone === t.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-card text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </FieldGroup>

        {/* Num Variations */}
        <FieldGroup label="কতটি ভিন্ন ভার্শন?">
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

        {/* Image-specific fields */}
        <AnimatePresence>
          {mode === 'image' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden space-y-5"
            >
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[12px] uppercase tracking-wider text-muted-foreground font-heading-bn">ইমেজ সেটিংস</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Product Image Upload */}
              <FieldGroup label="পণ্যের ছবি আপলোড">
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
                      <img
                        src={form.productImagePreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <div className="text-left">
                        <p className="text-sm font-heading-bn text-foreground truncate max-w-[140px]">
                          {form.productImage?.name}
                        </p>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            updateField('productImage', null);
                            updateField('productImagePreview', null);
                          }}
                          className="text-xs text-primary font-heading-bn mt-1"
                        >
                          পরিবর্তন করুন
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-3xl mb-2">📷</p>
                      <p className="text-sm font-heading-bn text-muted-foreground">ছবি টেনে আনুন বা ক্লিক করুন</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG • সর্বোচ্চ 5MB</p>
                    </>
                  )}
                </div>
              </FieldGroup>

              {/* Image Format */}
              <FieldGroup label="ইমেজ ফরম্যাট">
                <div className="flex gap-2">
                  {IMAGE_FORMATS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => updateField('imageFormat', f.value)}
                      className={`flex-1 py-2.5 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 ${
                        form.imageFormat === f.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-input bg-card text-foreground'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              {/* Image Style */}
              <FieldGroup label="স্টাইল">
                <div className="grid grid-cols-2 gap-2">
                  {IMAGE_STYLES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => updateField('imageStyle', s.value)}
                      className={`px-3 py-2 rounded-full border-[1.5px] text-[13px] font-medium transition-all duration-150 active:scale-95 ${
                        form.imageStyle === s.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-input bg-card text-foreground'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              {/* Brand Colors */}
              <FieldGroup label="ব্র্যান্ড রঙ (ঐচ্ছিক)">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground font-heading-bn">প্রাথমিক</label>
                    <input
                      type="color"
                      value={form.brandColorPrimary}
                      onChange={e => updateField('brandColorPrimary', e.target.value)}
                      className="w-8 h-8 rounded-full border border-input cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground font-heading-bn">মাধ্যমিক</label>
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
                    ব্র্যান্ড ডিফল্ট
                  </button>
                </div>
              </FieldGroup>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spacer for sticky button */}
        <div className="h-20" />
      </div>

      {/* Sticky Generate Button */}
      <div className="sticky bottom-0 bg-gradient-to-t from-card via-card to-transparent px-6 lg:px-7 pb-5 pt-4">
        <button
          onClick={onGenerate}
          disabled={generating || !form.productName.trim()}
          className={`w-full h-[52px] rounded-[14px] font-bold text-[17px] font-heading-bn text-primary-foreground transition-all duration-200 ${
            generating
              ? 'bg-primary/70 cursor-not-allowed opacity-80'
              : 'bg-primary hover:brightness-110 shadow-orange-glow active:scale-[0.98]'
          }`}
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-bounce">🚀</span>
              <span className="animate-pulse">{loadingTexts[loadingTextIdx % loadingTexts.length]}</span>
            </span>
          ) : (
            mode === 'copy' ? '✍️ বিজ্ঞাপন কপি তৈরি করুন' : '🖼️ ইমেজ বিজ্ঞাপন তৈরি করুন'
          )}
        </button>
        <p className="text-center text-[11px] text-muted-foreground mt-2 font-heading-bn">সাধারণত ৮-১৫ সেকেন্ড লাগে</p>
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
