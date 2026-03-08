import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUpgrade } from '@/contexts/UpgradeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StageIndicator from './video/StageIndicator';
import VideoSetup from './video/VideoSetup';
import VideoProcessing from './video/VideoProcessing';
import VideoResultView from './video/VideoResult';
import ScriptPreviewModal from './video/ScriptPreviewModal';
import type { VideoStage, VideoFormData, VideoScript, VideoResult, ProcessingStep } from './video/types';
import { DEFAULT_FORM } from './video/types';

const SLIDE_VARIANTS = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
};

const VideoAd = () => {
  const { user, profile, activeWorkspace } = useAuth();
  const { t, lang } = useLanguage();
  const { showUpgrade } = useUpgrade();

  const [stage, setStage] = useState<VideoStage>(1);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<VideoFormData>(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState<VideoScript | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [result, setResult] = useState<VideoResult | null>(null);
  const [usageUsed, setUsageUsed] = useState(0);
  const [usageLimit] = useState(2);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval>>();
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { label: 'স্ক্রিপ্ট তৈরি হচ্ছে...', labelEn: 'Creating script...', status: 'waiting' },
    { label: 'ছবি প্রসেস করা হচ্ছে...', labelEn: 'Processing images...', status: 'waiting' },
    { label: 'টেক্সট ওভারলে যোগ করা হচ্ছে...', labelEn: 'Adding text overlays...', status: 'waiting' },
    { label: 'মিউজিক মিশ্রণ করা হচ্ছে...', labelEn: 'Mixing music...', status: 'waiting' },
    { label: 'ফাইনাল রেন্ডার হচ্ছে...', labelEn: 'Final rendering...', status: 'waiting' },
  ]);

  const plan = profile?.plan || 'pro';

  // Check plan access
  useEffect(() => {
    if (plan === 'free') {
      showUpgrade('video');
    }
  }, [plan, showUpgrade]);

  // Fetch usage
  useEffect(() => {
    if (!user) return;
    const fetchUsage = async () => {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count } = await supabase
        .from('usage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('feature', 'video_ad')
        .gte('created_at', firstOfMonth);
      setUsageUsed(count || 0);
    };
    fetchUsage();
  }, [user]);

  const goToStage = (s: VideoStage) => {
    setDirection(s > stage ? 1 : -1);
    setStage(s);
  };

  const generateScript = useCallback(async () => {
    if (!activeWorkspace) { toast.error(t('প্রথমে শপ তৈরি করুন', 'Create a shop first')); return; }
    if (!form.productName.trim()) { toast.error(t('পণ্যের নাম দিন', 'Enter product name')); return; }
    if (form.images.length === 0) { toast.error(t('ছবি আপলোড করুন', 'Upload images')); return; }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-script', {
        body: {
          workspace_id: activeWorkspace.id,
          product_name: form.productName,
          key_message: form.keyMessage,
          original_price_bdt: form.originalPrice ? parseInt(form.originalPrice) : undefined,
          offer_price_bdt: form.offerPrice ? parseInt(form.offerPrice) : undefined,
          cta_text: form.ctaText,
          style: form.style,
          language: form.textLanguage,
          num_images: form.images.length,
        },
      });

      if (error) throw error;
      if (data?.success && data.script) {
        setScript(data.script);
        setShowScriptModal(true);
      } else {
        toast.error(data?.error || t('স্ক্রিপ্ট তৈরি ব্যর্থ', 'Script generation failed'));
      }
    } catch (e: any) {
      console.error(e);
      toast.error(t('সমস্যা হয়েছে', 'Something went wrong'));
    } finally {
      setGenerating(false);
    }
  }, [activeWorkspace, form, t]);

  const startVideoGeneration = useCallback(async (overrideScript?: VideoScript) => {
    const activeScript = overrideScript || script;
    if (plan === 'pro' && usageUsed >= usageLimit) {
      showUpgrade('video');
      return;
    }

    setShowScriptModal(false);
    goToStage(2);
    setElapsedSeconds(0);

    // Start elapsed timer
    elapsedRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);

    // Simulate processing steps (mock since no Shotstack)
    const stepTimings = [2000, 5000, 9000, 13000, 18000];
    const updateStep = (idx: number, status: 'active' | 'done') => {
      setProcessingSteps(prev => prev.map((s, i) => {
        if (i === idx) return { ...s, status };
        if (i === idx - 1 && status === 'active') return { ...s, status: 'done' };
        return s;
      }));
    };

    // Reset steps
    setProcessingSteps(prev => prev.map(s => ({ ...s, status: 'waiting' as const })));

    // Simulate step progression
    for (let i = 0; i < stepTimings.length; i++) {
      await new Promise(r => setTimeout(r, i === 0 ? stepTimings[0] : stepTimings[i] - stepTimings[i - 1]));
      updateStep(i, 'active');
    }

    // Complete final step
    await new Promise(r => setTimeout(r, 4000));
    updateStep(4, 'done');

    // Clear timer
    if (elapsedRef.current) clearInterval(elapsedRef.current);

    // Log usage
    if (user) {
      await supabase.from('usage_logs').insert({
        user_id: user.id,
        workspace_id: activeWorkspace?.id,
        feature: 'video_ad',
      });
      setUsageUsed(u => u + 1);
    }

    // Save to database (mock result)
    const dhoomScore = calculateDhoomScore();
    if (activeWorkspace) {
      const { data: videoRow } = await (supabase as any).from('video_ads').insert({
        workspace_id: activeWorkspace.id,
        product_name: form.productName,
        status: 'completed',
        script: activeScript as any,
        style: form.style,
        music_track: form.musicTrack,
        font_style: form.fontStyle,
        voiceover_enabled: form.voiceoverEnabled,
        dhoom_score: dhoomScore,
        completed_at: new Date().toISOString(),
      }).select('id').single();

      setResult({
        id: videoRow?.id || crypto.randomUUID(),
        videoUrl: '', // Mock - no actual video URL without Shotstack
        dhoomScore,
        productName: form.productName,
        format: form.format,
        style: form.style,
        musicTrack: form.musicTrack,
        script: activeScript!,
        createdAt: new Date().toISOString(),
      });
    }

    goToStage(3);
  }, [script, form, plan, usageUsed, usageLimit, user, activeWorkspace, showUpgrade]);

  const calculateDhoomScore = () => {
    let score = script?.dhoom_score_prediction || 70;
    if (form.format === 'reels') score += 5;
    if (form.musicTrack !== 'none') score += 3;
    if (form.ctaText) score += 5;
    if (form.images.length >= 3) score += 4;
    return Math.min(100, score);
  };

  const handleCancel = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    goToStage(1);
    setProcessingSteps(prev => prev.map(s => ({ ...s, status: 'waiting' as const })));
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    setScript(null);
    setResult(null);
    goToStage(1);
  };

  // Free users see upgrade gate
  if (plan === 'free') {
    return (
      <div className="h-full flex items-center justify-center text-center px-8">
        <div>
          <span className="text-5xl mb-4 block">🎬</span>
          <h2 className="text-2xl font-bold font-heading-bn text-foreground mb-2">{t('ভিডিও বিজ্ঞাপন', 'Video Ads')}</h2>
          <p className="text-muted-foreground font-heading-bn mb-6">{t('Pro বা Agency প্ল্যানে আপগ্রেড করুন', 'Upgrade to Pro or Agency plan')}</p>
          <button onClick={() => showUpgrade('video')} className="px-8 py-3 rounded-xl bg-gradient-cta text-primary-foreground font-bold font-heading-bn shadow-orange-glow">
            {t('আপগ্রেড করুন', 'Upgrade')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden -m-3 sm:-m-6 md:-m-8">
      {/* Stage indicator */}
      <StageIndicator currentStage={stage} />

      {/* Stage content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={stage}
            custom={direction}
            variants={SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {stage === 1 && (
              <VideoSetup
                form={form}
                setForm={setForm}
                onPreviewScript={generateScript}
                onGenerate={async () => {
                  if (!activeWorkspace) { toast.error(t('প্রথমে শপ তৈরি করুন', 'Create a shop first')); return; }
                  if (!form.productName.trim()) { toast.error(t('পণ্যের নাম দিন', 'Enter product name')); return; }
                  if (form.images.length === 0) { toast.error(t('ছবি আপলোড করুন', 'Upload images')); return; }

                  // Auto-generate script if not already generated, then start video
                  if (!script) {
                    setGenerating(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('generate-video-script', {
                        body: {
                          workspace_id: activeWorkspace.id,
                          product_name: form.productName,
                          key_message: form.keyMessage,
                          original_price_bdt: form.originalPrice ? parseInt(form.originalPrice) : undefined,
                          offer_price_bdt: form.offerPrice ? parseInt(form.offerPrice) : undefined,
                          cta_text: form.ctaText,
                          style: form.style,
                          language: form.textLanguage,
                          num_images: form.images.length,
                        },
                      });
                      if (error) throw error;
                      if (data?.success && data.script) {
                        setScript(data.script);
                        setGenerating(false);
                        startVideoGeneration(data.script);
                        return;
                      } else {
                        toast.error(data?.error || t('স্ক্রিপ্ট তৈরি ব্যর্থ', 'Script generation failed'));
                      }
                    } catch (e: any) {
                      console.error(e);
                      toast.error(t('সমস্যা হয়েছে', 'Something went wrong'));
                    } finally {
                      setGenerating(false);
                    }
                  } else {
                    startVideoGeneration();
                  }
                }}
                generating={generating}
                usageUsed={usageUsed}
                usageLimit={usageLimit}
                plan={plan}
              />
            )}
            {stage === 2 && (
              <VideoProcessing
                onCancel={handleCancel}
                steps={processingSteps}
                elapsedSeconds={elapsedSeconds}
              />
            )}
            {stage === 3 && result && (
              <VideoResultView
                result={result}
                plan={plan}
                usageUsed={usageUsed}
                usageLimit={usageLimit}
                onReset={handleReset}
                onRegenerate={() => {
                  goToStage(1);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Script preview modal */}
      <AnimatePresence>
        {showScriptModal && script && (
          <ScriptPreviewModal
            script={script}
            form={form}
            onClose={() => setShowScriptModal(false)}
            onConfirm={startVideoGeneration}
            onRegenerate={generateScript}
            regenerating={generating}
            generating={false}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoAd;
