import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, GripVertical, Play, Square, Rocket, ChevronDown, ChevronUp, Mic } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  VideoFormData, VideoFormat, VideoStyle, MusicTrack,
  TextLanguage, FontStyle, TextAnimation,
  FORMAT_OPTIONS as FO, STYLE_OPTIONS as SO, MUSIC_OPTIONS as MO, CTA_PRESETS as CP
} from './types';
import {
  FORMAT_OPTIONS, STYLE_OPTIONS, MUSIC_OPTIONS, CTA_PRESETS
} from './types';

interface VideoSetupProps {
  form: VideoFormData;
  setForm: React.Dispatch<React.SetStateAction<VideoFormData>>;
  onPreviewScript: () => void;
  onGenerate: () => void;
  generating: boolean;
  usageUsed: number;
  usageLimit: number;
  plan: string;
}

const MAX_IMAGES = 5;
const MAX_SIZE = 8 * 1024 * 1024;

const VideoSetup = ({ form, setForm, onPreviewScript, onGenerate, generating, usageUsed, usageLimit, plan }: VideoSetupProps) => {
  const { t, lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [voiceoverOpen, setVoiceoverOpen] = useState(false);
  const [playingMusic, setPlayingMusic] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Music preview frequencies/styles per track
  const MUSIC_PREVIEWS: Record<string, { frequency: number; type: OscillatorType; tempo: number }> = {
    energetic: { frequency: 440, type: 'square', tempo: 8 },
    soft: { frequency: 330, type: 'sine', tempo: 4 },
    trendy: { frequency: 392, type: 'sawtooth', tempo: 6 },
    corporate: { frequency: 349, type: 'triangle', tempo: 3 },
  };

  const stopMusicPreview = useCallback(() => {
    if (oscillatorRef.current) {
      try { oscillatorRef.current.stop(); } catch {}
      oscillatorRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current = null;
    }
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
    setPlayingMusic(null);
  }, []);

  const playMusicPreview = useCallback((trackValue: string) => {
    if (playingMusic === trackValue) {
      stopMusicPreview();
      return;
    }
    stopMusicPreview();

    const config = MUSIC_PREVIEWS[trackValue];
    if (!config) return;

    const ctx = audioContextRef.current || new AudioContext();
    audioContextRef.current = ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = config.type;
    osc.frequency.setValueAtTime(config.frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);

    // Create a rhythmic pattern
    const now = ctx.currentTime;
    for (let i = 0; i < config.tempo * 5; i++) {
      const t = now + (i / config.tempo);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.setValueAtTime(0.02, t + (0.5 / config.tempo));
      // Slight pitch variation for musicality
      osc.frequency.setValueAtTime(config.frequency * (1 + (i % 4 === 2 ? 0.125 : 0)), t);
    }

    // Fade out at end
    gain.gain.setValueAtTime(0.15, now + 4.5);
    gain.gain.linearRampToValueAtTime(0, now + 5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 5);

    oscillatorRef.current = osc;
    gainNodeRef.current = gain;
    setPlayingMusic(trackValue);

    playTimerRef.current = setTimeout(() => {
      setPlayingMusic(null);
      oscillatorRef.current = null;
    }, 5000);
  }, [playingMusic, stopMusicPreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMusicPreview();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopMusicPreview]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => {
      if (!f.type.startsWith('image/')) { toast.error(t('শুধু ছবি আপলোড করুন', 'Only images allowed')); return false; }
      if (f.size > MAX_SIZE) { toast.error(t('ছবি ৮MB এর কম হতে হবে', 'Image must be under 8MB')); return false; }
      return true;
    });
    const total = form.images.length + arr.length;
    if (total > MAX_IMAGES) { toast.error(t('সর্বোচ্চ ৫টি ছবি', 'Maximum 5 images')); return; }

    arr.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setForm(prev => ({
          ...prev,
          images: [...prev.images, file],
          imagePreviews: [...prev.imagePreviews, e.target?.result as string],
        }));
      };
      reader.readAsDataURL(file);
    });
  }, [form.images.length, t, setForm]);

  const removeImage = (idx: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
      imagePreviews: prev.imagePreviews.filter((_, i) => i !== idx),
    }));
  };

  const moveImage = (fromIdx: number, toIdx: number) => {
    setForm(prev => {
      const imgs = [...prev.images];
      const previews = [...prev.imagePreviews];
      const [img] = imgs.splice(fromIdx, 1);
      const [preview] = previews.splice(fromIdx, 1);
      imgs.splice(toIdx, 0, img);
      previews.splice(toIdx, 0, preview);
      return { ...prev, images: imgs, imagePreviews: previews };
    });
  };

  const SectionPill = ({ step, title }: { step: number; title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold font-heading-bn">
        {t(`ধাপ ${step}`, `Step ${step}`)}
      </span>
      <h3 className="text-[17px] font-bold font-heading-bn text-foreground">{title}</h3>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[760px] mx-auto px-6 py-8 pb-32">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-[28px] font-bold font-heading-bn text-foreground leading-tight">
              {t('ভিডিও বিজ্ঞাপন তৈরি করুন', 'Create Video Ad')}
            </h1>
            <p className="text-base text-muted-foreground font-heading-bn mt-1">
              {t('পণ্যের ছবি দিন — AI ১৫ সেকেন্ডের ভিডিও বানাবে', 'Upload product images — AI will create a 15-second video')}
            </p>
          </div>
          {plan === 'pro' && (
            <div className="text-right shrink-0">
              <p className="text-[13px] text-muted-foreground font-heading-bn">
                {t(`এই মাসে ${usageUsed}/${usageLimit} ভিডিও`, `${usageUsed}/${usageLimit} videos this month`)}
              </p>
              <div className="flex gap-1 justify-end mt-1">
                {Array.from({ length: usageLimit }).map((_, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < usageUsed ? 'bg-primary' : 'border border-border'}`} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION A: Image Upload */}
        <div className="mb-10">
          <SectionPill step={1} title={t('পণ্যের ছবি আপলোড', 'Upload Product Images')} />

          {form.imagePreviews.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[20px] min-h-[180px] flex flex-col items-center justify-center cursor-pointer transition-all ${
                dragOver ? 'border-primary bg-primary/[0.04] scale-[1.01]' : 'border-border bg-secondary hover:border-primary/40'
              }`}
            >
              {dragOver ? (
                <p className="text-primary font-heading-bn font-semibold text-lg">{t('ছেড়ে দিন!', 'Drop here!')}</p>
              ) : (
                <>
                  <span className="text-[40px] mb-2">🎬</span>
                  <p className="text-base text-muted-foreground font-heading-bn">{t('ছবি টেনে আনুন অথবা ক্লিক করুন', 'Drag images or click to upload')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('সর্বোচ্চ ৫টি ছবি • PNG, JPG • প্রতিটি সর্বোচ্চ 8MB', 'Max 5 images • PNG, JPG • Max 8MB each')}</p>
                  <p className="text-xs text-primary italic mt-1">{t('ভালো ফলাফলের জন্য ৩-৫টি ছবি দিন', 'Use 3-5 images for best results')}</p>
                </>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-[20px] p-4 bg-secondary">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {form.imagePreviews.map((preview, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', String(idx))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); moveImage(Number(e.dataTransfer.getData('text/plain')), idx); }}
                    className="relative w-[100px] h-[100px] shrink-0 rounded-xl overflow-hidden border-2 border-transparent hover:border-primary/30 group cursor-grab active:cursor-grabbing"
                  >
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="w-6 h-6 rounded-full bg-white flex items-center justify-center absolute top-1.5 right-1.5">
                        <X size={12} className="text-destructive" />
                      </button>
                      <GripVertical size={16} className="text-white absolute top-1.5 left-1.5" />
                    </div>
                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full">{idx + 1}</span>
                  </div>
                ))}
                {form.images.length < MAX_IMAGES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-[100px] h-[100px] shrink-0 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <span className="text-lg">+</span>
                    <span className="text-[10px] font-heading-bn">{t('আরো যোগ', 'Add more')}</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-heading-bn mt-2">
                📌 {t('ছবির ক্রম ভিডিওর ক্রম নির্ধারণ করে। টেনে সাজিয়ে নিন।', 'Image order determines video order. Drag to rearrange.')}
              </p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
        </div>

        {/* SECTION B: Product Info */}
        <div className="mb-10">
          <SectionPill step={2} title={t('পণ্যের বিবরণ', 'Product Details')} />

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold font-heading-bn text-foreground mb-1.5 block">
                {t('পণ্যের নাম', 'Product Name')} <span className="text-destructive">*</span>
              </label>
              <input
                value={form.productName}
                onChange={e => setForm(p => ({ ...p, productName: e.target.value }))}
                placeholder={t('যেমন: প্রিমিয়াম লেদার ব্যাগ', 'e.g. Premium Leather Bag')}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground font-heading-bn focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-semibold font-heading-bn text-foreground mb-1.5 block">
                {t('মূল বার্তা', 'Key Message')}
              </label>
              <textarea
                rows={3}
                value={form.keyMessage}
                onChange={e => setForm(p => ({ ...p, keyMessage: e.target.value }))}
                placeholder={t('আপনার বিজ্ঞাপনের মূল কথা কী?\nযেমন: সীমিত সময়ের অফার, নতুন কালেকশন...', 'What\'s the main message?\ne.g. Limited time offer, new collection...')}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground font-heading-bn focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1">{t('AI এই তথ্য থেকে ভিডিওর স্ক্রিপ্ট লিখবে', 'AI will write video script from this')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold font-heading-bn text-foreground mb-1.5 block">
                  {t('মূল মূল্য ৳', 'Original Price ৳')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">৳</span>
                  <input
                    type="number"
                    value={form.originalPrice}
                    onChange={e => setForm(p => ({ ...p, originalPrice: e.target.value }))}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-card text-foreground font-heading-bn focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold font-heading-bn text-foreground mb-1.5 block">
                  {t('অফার মূল্য ৳', 'Offer Price ৳')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">৳</span>
                  <input
                    type="number"
                    value={form.offerPrice}
                    onChange={e => setForm(p => ({ ...p, offerPrice: e.target.value }))}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-card text-foreground font-heading-bn focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold font-heading-bn text-foreground mb-1.5 block">
                {t('CTA বাটন টেক্সট', 'CTA Button Text')}
              </label>
              <input
                value={form.ctaText}
                onChange={e => setForm(p => ({ ...p, ctaText: e.target.value.slice(0, 30) }))}
                maxLength={30}
                placeholder={t('যেমন: এখনই কিনুন', 'e.g. Buy Now')}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground font-heading-bn focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {CTA_PRESETS.map(cta => (
                  <button
                    key={cta.en}
                    onClick={() => setForm(p => ({ ...p, ctaText: t(cta.bn, cta.en) }))}
                    className="px-3 py-1 rounded-full bg-secondary text-[13px] font-heading-bn text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    {t(cta.bn, cta.en)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION C: Video Settings */}
        <div className="mb-10">
          <SectionPill step={3} title={t('ভিডিও কাস্টমাইজেশন', 'Video Customization')} />

          {/* Format */}
          <div className="mb-6">
            <label className="text-sm font-semibold font-heading-bn text-foreground mb-3 block">{t('প্ল্যাটফর্ম ফরম্যাট', 'Platform Format')}</label>
            <div className="grid grid-cols-3 gap-3">
              {FORMAT_OPTIONS.map(fmt => (
                <button
                  key={fmt.value}
                  onClick={() => setForm(p => ({ ...p, format: fmt.value }))}
                  className={`relative p-4 rounded-2xl border-[1.5px] text-center transition-all ${
                    form.format === fmt.value
                      ? 'border-primary bg-primary/[0.04] shadow-[0_4px_16px_rgba(255,81,0,0.12)]'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  {fmt.badge && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold whitespace-nowrap">
                      {t(fmt.badge, fmt.badgeEn || fmt.badge)}
                    </span>
                  )}
                  <div className="flex justify-center mb-2">
                    <div className={`bg-border rounded-sm ${fmt.value === 'feed' ? 'w-10 h-10' : 'w-6 h-10'}`} />
                  </div>
                  <div className="text-lg mb-1">{fmt.icons.join(' ')}</div>
                  <p className="text-sm font-semibold font-heading-bn text-foreground">{t(fmt.label, fmt.labelEn)}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{fmt.dimensions}</p>
                  <p className="text-[11px] text-muted-foreground font-heading-bn mt-0.5">{t(fmt.desc, fmt.descEn)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="mb-6">
            <label className="text-sm font-semibold font-heading-bn text-foreground mb-3 block">{t('ভিজুয়াল স্টাইল', 'Visual Style')}</label>
            <div className="grid grid-cols-2 gap-3">
              {STYLE_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setForm(p => ({ ...p, style: s.value }))}
                  className={`p-4 rounded-[14px] border-[1.5px] text-left transition-all ${
                    form.style === s.value
                      ? 'border-primary bg-primary/[0.04]'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className={`w-[60px] h-10 rounded-md bg-gradient-to-br ${s.gradient} mb-2 border border-border/30`} />
                  <p className="text-sm font-semibold font-heading-bn text-foreground">{t(s.label, s.labelEn)}</p>
                  <p className="text-[11px] text-muted-foreground font-heading-bn">{t(s.desc, s.descEn)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Best: {t(s.best, s.bestEn)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Music */}
          <div className="mb-6">
            <label className="text-sm font-semibold font-heading-bn text-foreground mb-3 block">{t('ব্যাকগ্রাউন্ড মিউজিক', 'Background Music')}</label>
            <div className="space-y-2">
              {MUSIC_OPTIONS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setForm(p => ({ ...p, musicTrack: m.value }))}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-[1.5px] transition-all text-left ${
                    form.musicTrack === m.value
                      ? 'border-primary bg-primary/[0.04]'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    form.musicTrack === m.value ? 'border-primary' : 'border-border'
                  }`}>
                    {form.musicTrack === m.value && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <span className="text-lg shrink-0">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold font-heading-bn text-foreground">{t(m.label, m.labelEn)}</p>
                    <p className="text-[11px] text-muted-foreground font-heading-bn">{t(m.desc, m.descEn)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Text Settings */}
          <div className="mb-6">
            <label className="text-sm font-semibold font-heading-bn text-foreground mb-3 block">{t('টেক্সট সেটিংস', 'Text Settings')}</label>

            {/* Language */}
            <div className="flex gap-2 mb-4">
              {([
                { val: 'bn' as TextLanguage, label: '🇧🇩 বাংলা', labelEn: '🇧🇩 Bangla' },
                { val: 'banglish' as TextLanguage, label: '🔤 Banglish', labelEn: '🔤 Banglish' },
                { val: 'en' as TextLanguage, label: '🇬🇧 English', labelEn: '🇬🇧 English' },
              ]).map(l => (
                <button
                  key={l.val}
                  onClick={() => setForm(p => ({ ...p, textLanguage: l.val }))}
                  className={`px-4 py-2 rounded-xl text-sm font-heading-bn transition-all ${
                    form.textLanguage === l.val
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(l.label, l.labelEn)}
                </button>
              ))}
            </div>

            {/* Font Style */}
            <div className="flex gap-2 mb-4">
              {([
                { val: 'hind' as FontStyle, label: 'হিন্দ সিলিগুড়ি', labelEn: 'Hind Siliguri', cls: 'font-heading-bn' },
                { val: 'bold' as FontStyle, label: 'এক্সট্রা বোল্ড', labelEn: 'Extra Bold', cls: 'font-black' },
                { val: 'modern' as FontStyle, label: 'মডার্ন', labelEn: 'Modern', cls: 'font-sans' },
              ]).map(f => (
                <button
                  key={f.val}
                  onClick={() => setForm(p => ({ ...p, fontStyle: f.val }))}
                  className={`px-4 py-2 rounded-xl text-sm transition-all ${f.cls} ${
                    form.fontStyle === f.val
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(f.label, f.labelEn)}
                </button>
              ))}
            </div>

            {/* Text Animation */}
            <label className="text-xs text-muted-foreground mb-2 block font-heading-bn">{t('টেক্সট অ্যানিমেশন', 'Text Animation')}</label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { val: 'fade' as TextAnimation, label: 'ফেড ইন', labelEn: 'Fade In' },
                { val: 'slide' as TextAnimation, label: 'স্লাইড আপ', labelEn: 'Slide Up' },
                { val: 'typewriter' as TextAnimation, label: 'টাইপরাইটার', labelEn: 'Typewriter' },
                { val: 'zoom' as TextAnimation, label: 'জুম', labelEn: 'Zoom' },
              ]).map(a => (
                <button
                  key={a.val}
                  onClick={() => setForm(p => ({ ...p, textAnimation: a.val }))}
                  className={`p-3 rounded-xl border-[1.5px] text-center transition-all ${
                    form.textAnimation === a.val
                      ? 'border-primary bg-primary/[0.04]'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="h-[50px] flex items-center justify-center overflow-hidden mb-1">
                    <span className="text-[11px] font-heading-bn text-foreground">{t('আজই নিন!', 'Get it!')}</span>
                  </div>
                  <p className="text-[10px] font-heading-bn text-muted-foreground">{t(a.label, a.labelEn)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Voiceover (collapsible) */}
          <div className="mb-6">
            <button
              onClick={() => setVoiceoverOpen(!voiceoverOpen)}
              className="flex items-center gap-2 text-sm font-semibold font-heading-bn text-foreground hover:text-primary transition-colors"
            >
              <Mic size={16} />
              {t('🎙️ ভয়েসওভার যোগ করুন (ঐচ্ছিক)', '🎙️ Add Voiceover (optional)')}
              {voiceoverOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
              {voiceoverOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-heading-bn">{t('AI ভয়েসওভার চাই', 'Enable AI Voiceover')}</span>
                      <button
                        onClick={() => setForm(p => ({ ...p, voiceoverEnabled: !p.voiceoverEnabled }))}
                        className={`w-11 h-6 rounded-full transition-colors relative ${form.voiceoverEnabled ? 'bg-primary' : 'bg-border'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${form.voiceoverEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    {form.voiceoverEnabled && (
                      <>
                        <div className="flex gap-2">
                          {([
                            { val: 'male' as const, label: '👨 পুরুষ কণ্ঠ', labelEn: '👨 Male' },
                            { val: 'female' as const, label: '👩 মহিলা কণ্ঠ', labelEn: '👩 Female' },
                          ]).map(v => (
                            <button
                              key={v.val}
                              onClick={() => setForm(p => ({ ...p, voiceGender: v.val }))}
                              className={`px-4 py-2 rounded-xl text-sm font-heading-bn transition-all ${
                                form.voiceGender === v.val ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                              }`}
                            >
                              {t(v.label, v.labelEn)}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          {([
                            { val: 'warm' as const, label: '😊 উষ্ণ', labelEn: '😊 Warm' },
                            { val: 'professional' as const, label: '💼 পেশাদার', labelEn: '💼 Professional' },
                            { val: 'excited' as const, label: '🔥 উৎসাহী', labelEn: '🔥 Excited' },
                          ]).map(v => (
                            <button
                              key={v.val}
                              onClick={() => setForm(p => ({ ...p, voiceTone: v.val }))}
                              className={`px-4 py-2 rounded-xl text-sm font-heading-bn transition-all ${
                                form.voiceTone === v.val ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                              }`}
                            >
                              {t(v.label, v.labelEn)}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-heading-bn">{t('AI স্বয়ংক্রিয়ভাবে স্ক্রিপ্ট লিখবে', 'AI will auto-generate the script')}</p>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-6 py-4 z-10">
        <div className="max-w-[760px] mx-auto flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-heading-bn hidden sm:block">
            💡 {t('ভিডিও তৈরিতে সাধারণত ৩০-৬০ সেকেন্ড লাগে', 'Video generation usually takes 30-60 seconds')}
          </p>
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onPreviewScript}
              disabled={!form.productName.trim() || form.images.length === 0 || generating}
              className="px-5 py-3 rounded-xl border border-border text-sm font-heading-bn font-semibold text-foreground hover:bg-secondary transition-all disabled:opacity-50"
            >
              {t('প্রিভিউ স্ক্রিপ্ট', 'Preview Script')}
            </button>
            <button
              onClick={onGenerate}
              disabled={!form.productName.trim() || form.images.length === 0 || generating}
              className="px-8 py-3 rounded-xl bg-gradient-cta text-primary-foreground text-sm font-heading-bn font-bold shadow-orange-glow hover:scale-[1.02] transition-all disabled:opacity-50 active:scale-95"
            >
              {t('ভিডিও তৈরি করুন 🚀', 'Create Video 🚀')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoSetup;
