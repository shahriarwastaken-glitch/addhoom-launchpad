import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Copy, Share2, RefreshCw, Edit3, Play, Pause, Volume2, VolumeX, Maximize, Check, Star, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { VideoResult as VResult, VideoScript, VideoFormat, VideoStyle, MusicTrack } from './types';

interface VideoResultProps {
  result: VResult;
  plan: string;
  usageUsed: number;
  usageLimit: number;
  onReset: () => void;
  onRegenerate: () => void;
}

const VideoResultView = ({ result, plan, usageUsed, usageLimit, onReset, onRegenerate }: VideoResultProps) => {
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [showBanner, setShowBanner] = useState(true);
  const [caption, setCaption] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [captionPlatform, setCaptionPlatform] = useState<'facebook' | 'instagram'>('facebook');
  const [scoreExpanded, setScoreExpanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowBanner(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
    setPlaying(!playing);
  };

  const handleDownload = async () => {
    if (!result.videoUrl) {
      toast.info(t('ভিডিও রেন্ডারিং এখনো সংযুক্ত হয়নি। শীঘ্রই আসছে!', 'Video rendering not yet connected. Coming soon!'));
      return;
    }
    try {
      const a = document.createElement('a');
      a.href = result.videoUrl;
      a.download = `addhoom-video-${result.productName}-${new Date().toISOString().slice(0,10)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(t('ডাউনলোড শুরু হচ্ছে...', 'Download starting...'));
    } catch {
      toast.error(t('ডাউনলোড ব্যর্থ', 'Download failed'));
    }
  };

  const copyUrl = () => {
    if (!result.videoUrl) {
      toast.info(t('ভিডিও URL এখনো তৈরি হয়নি', 'Video URL not yet available'));
      return;
    }
    navigator.clipboard.writeText(result.videoUrl);
    toast.success(t('URL কপি হয়েছে!', 'URL copied!'));
  };

  const generateCaption = async () => {
    if (!activeWorkspace) return;
    setGeneratingCaption(true);
    try {
      const { data } = await supabase.functions.invoke('generate-video-script', {
        body: {
          workspace_id: activeWorkspace.id,
          action: 'caption',
          product_name: result.productName,
          platform: captionPlatform,
          language: lang,
        },
      });
      if (data?.caption) {
        setCaption(data.caption);
      }
    } catch {
      toast.error(t('ক্যাপশন তৈরি ব্যর্থ', 'Caption generation failed'));
    } finally {
      setGeneratingCaption(false);
    }
  };

  const scoreColor = result.dhoomScore >= 75 ? 'text-brand-green' : result.dhoomScore >= 50 ? 'text-[#FFB800]' : 'text-destructive';
  const isReels = result.format === 'reels' || result.format === 'story';

  const formatLabel = result.format === 'feed' ? '1:1 Feed' : '9:16 Reels';
  const musicLabel = result.musicTrack === 'none' ? t('নীরব', 'Silent') : result.musicTrack;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[900px] mx-auto px-6 py-8">
        {/* Success banner */}
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 bg-brand-green text-white rounded-2xl px-5 py-3 flex items-center justify-between"
          >
            <span className="text-[15px] font-bold font-heading-bn">
              🎉 {t('ভিডিও তৈরি হয়েছে! ডাউনলোড করে এখনই পোস্ট করুন।', 'Video created! Download and post now.')}
            </span>
            <button onClick={() => setShowBanner(false)} className="text-white/80 hover:text-white">✕</button>
          </motion.div>
        )}

        {/* Main 2-column */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Video player */}
          <div className={`${isReels ? 'lg:w-[40%]' : 'lg:w-[45%]'} shrink-0`}>
            <div className={`relative ${isReels ? 'max-w-[280px] mx-auto' : ''}`}>
              {/* Phone mockup for reels */}
              {isReels && (
                <div className="rounded-[30px] border-[3px] border-foreground/10 p-1.5 bg-foreground/5">
                  <div className="w-20 h-1.5 rounded-full bg-foreground/10 mx-auto mb-1" />
                  <div className="rounded-[22px] overflow-hidden bg-[#1C1B1A] relative">
                    <video
                      ref={videoRef}
                      className="w-full aspect-[9/16] object-cover"
                      poster={result.videoUrl ? undefined : '/placeholder.svg'}
                      loop
                      muted={muted}
                      playsInline
                      onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                      onPlay={() => setPlaying(true)}
                      onPause={() => setPlaying(false)}
                    >
                      {result.videoUrl && <source src={result.videoUrl} type="video/mp4" />}
                    </video>
                    {/* Custom controls */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <div className="flex items-center gap-2">
                        <button onClick={togglePlay} className="text-white">
                          {playing ? <Pause size={20} /> : <Play size={20} />}
                        </button>
                        <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(currentTime / 15) * 100}%` }} />
                        </div>
                        <span className="text-white text-[11px] font-mono">{Math.floor(currentTime)}s/15s</span>
                        <button onClick={() => setMuted(!muted)} className="text-white">
                          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isReels && (
                <div className="rounded-[20px] overflow-hidden bg-[#1C1B1A] shadow-[0_24px_80px_rgba(0,0,0,0.2)] relative">
                  <video
                    ref={videoRef}
                    className="w-full aspect-square object-cover"
                    loop
                    muted={muted}
                    playsInline
                    onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                  >
                    {result.videoUrl && <source src={result.videoUrl} type="video/mp4" />}
                  </video>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={togglePlay} className="text-white"><Play size={20} /></button>
                      <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(currentTime / 15) * 100}%` }} />
                      </div>
                      <span className="text-white text-[11px] font-mono">{Math.floor(currentTime)}s/15s</span>
                      <button onClick={() => setMuted(!muted)} className="text-white">
                        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick share */}
            <div className="flex justify-center gap-3 mt-4">
              <button onClick={copyUrl} className="px-3 py-1.5 rounded-lg border border-border text-xs font-heading-bn hover:bg-secondary transition-all flex items-center gap-1">
                <Copy size={12} /> {t('URL কপি', 'Copy URL')}
              </button>
              <button onClick={handleDownload} className="px-3 py-1.5 rounded-lg border border-border text-xs font-heading-bn hover:bg-secondary transition-all flex items-center gap-1">
                <Download size={12} /> {t('ডাউনলোড', 'Download')}
              </button>
            </div>
          </div>

          {/* Right: Details */}
          <div className="flex-1 space-y-5">
            {/* Title */}
            <h2 className="text-xl font-bold font-heading-bn text-foreground">
              {result.productName} {t('ভিডিও বিজ্ঞাপন', 'Video Ad')}
            </h2>

            {/* Dhoom Score */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-border" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className={scoreColor} strokeWidth="3" strokeDasharray={`${result.dhoomScore}, 100`} strokeLinecap="round" />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold font-mono ${scoreColor}`}>{result.dhoomScore}</span>
                </div>
                <div>
                  <p className="text-sm font-bold font-heading-bn text-foreground">{t('ধুম স্কোর', 'Dhoom Score')}</p>
                  <p className="text-xs text-muted-foreground">{result.dhoomScore >= 75 ? t('দারুণ!', 'Excellent!') : t('ভালো', 'Good')}</p>
                </div>
              </div>

              <button onClick={() => setScoreExpanded(!scoreExpanded)} className="text-xs text-muted-foreground mt-3 flex items-center gap-1 hover:text-foreground">
                {t('কেন ভালো দেখুন', 'See why')} <ChevronDown size={12} className={scoreExpanded ? 'rotate-180' : ''} />
              </button>
              {scoreExpanded && (
                <div className="mt-2 space-y-1">
                  <p className="text-[13px] text-brand-green font-heading-bn flex items-center gap-1"><Check size={12} /> {t('শক্তিশালী প্রথম ফ্রেম', 'Strong first frame')}</p>
                  <p className="text-[13px] text-brand-green font-heading-bn flex items-center gap-1"><Check size={12} /> {t('স্পষ্ট CTA', 'Clear CTA')}</p>
                  <p className="text-[13px] text-brand-green font-heading-bn flex items-center gap-1"><Check size={12} /> {t('সঠিক সময়ের দৈর্ঘ্য (১৫ সেকেন্ড)', 'Correct duration (15 seconds)')}</p>
                </div>
              )}
            </div>

            {/* Specs */}
            <div className="border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div><span className="text-muted-foreground">{t('ফরম্যাট:', 'Format:')}</span> <span className="text-foreground font-medium">{formatLabel}</span></div>
                <div><span className="text-muted-foreground">{t('সময়:', 'Duration:')}</span> <span className="text-foreground font-medium">0:15</span></div>
                <div><span className="text-muted-foreground">{t('মিউজিক:', 'Music:')}</span> <span className="text-foreground font-medium capitalize">{musicLabel}</span></div>
                <div><span className="text-muted-foreground">{t('স্টাইল:', 'Style:')}</span> <span className="text-foreground font-medium capitalize">{result.style}</span></div>
              </div>
            </div>

            {/* Publish checklist */}
            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold font-heading-bn text-foreground mb-2">{t('পোস্ট করার আগে নিশ্চিত করুন:', 'Before posting, make sure:')}</p>
              <div className="space-y-1.5">
                {[
                  { bn: 'ক্যাপশন লেখা আছে', en: 'Caption is written' },
                  { bn: 'হ্যাশট্যাগ যোগ করা হয়েছে', en: 'Hashtags are added' },
                  { bn: 'সঠিক সময়ে পোস্ট হবে (সন্ধ্যা ৭-৯টা)', en: 'Post at right time (7-9 PM)' },
                  { bn: 'বুস্ট বাজেট নির্ধারিত', en: 'Boost budget set' },
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-2 text-[13px] font-heading-bn text-foreground">
                    <div className="w-4 h-4 rounded border border-brand-green bg-brand-green/10 flex items-center justify-center">
                      <Check size={10} className="text-brand-green" />
                    </div>
                    {t(item.bn, item.en)}
                  </label>
                ))}
              </div>
            </div>

            {/* Caption generator */}
            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold font-heading-bn text-foreground mb-2">📝 {t('ক্যাপশন তৈরি করুন', 'Generate Caption')}</p>
              <div className="flex gap-2 mb-3">
                {(['facebook', 'instagram'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setCaptionPlatform(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-heading-bn transition-all ${
                      captionPlatform === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {p === 'facebook' ? 'Facebook' : 'Instagram'}
                  </button>
                ))}
              </div>
              <button
                onClick={generateCaption}
                disabled={generatingCaption}
                className="px-4 py-2 rounded-xl bg-secondary text-sm font-heading-bn font-semibold hover:bg-primary/10 transition-all disabled:opacity-50 mb-3"
              >
                {generatingCaption ? t('লিখছে...', 'Writing...') : t('AI ক্যাপশন লিখুন', 'AI Caption')}
              </button>
              {caption && (
                <div>
                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm font-heading-bn resize-none"
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(caption); toast.success(t('কপি হয়েছে!', 'Copied!')); }}
                    className="mt-2 px-3 py-1.5 rounded-lg border border-border text-xs font-heading-bn hover:bg-secondary"
                  >
                    {t('কপি করুন', 'Copy')}
                  </button>
                </div>
              )}
            </div>

            {/* Download CTA */}
            <button
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl bg-gradient-cta text-primary-foreground text-[17px] font-bold font-heading-bn shadow-orange-glow hover:scale-[1.01] transition-all active:scale-[0.99]"
            >
              ⬇️ {t('MP4 ডাউনলোড করুন', 'Download MP4')}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              MP4 · H.264 · {result.format === 'feed' ? '1080×1080' : '1080×1920'} · ~8MB
            </p>

            {/* Secondary actions */}
            <div className="flex flex-wrap gap-3">
              <button onClick={onRegenerate} className="px-4 py-2 rounded-xl border border-border text-sm font-heading-bn hover:bg-secondary flex items-center gap-1">
                <RefreshCw size={14} /> {t('ভিন্ন স্টাইলে আবার বানান', 'Remake in different style')}
              </button>
              <button onClick={onReset} className="text-sm text-primary font-heading-bn hover:underline">
                {t('নতুন ভিডিও তৈরি করুন →', 'Create new video →')}
              </button>
            </div>

            {/* Pro usage tracker */}
            {plan === 'pro' && (
              <div className="border-t border-border pt-4">
                <p className="text-[13px] text-muted-foreground font-heading-bn">
                  {t(`এই মাসে: ${usageUsed}/${usageLimit} ভিডিও ব্যবহার হয়েছে`, `This month: ${usageUsed}/${usageLimit} videos used`)}
                </p>
                <div className="w-full h-2 rounded-full bg-border mt-2 overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(usageUsed / usageLimit) * 100}%` }} />
                </div>
                {usageUsed >= usageLimit && (
                  <p className="text-xs text-primary mt-2 font-heading-bn">{t('Agency প্ল্যানে আপগ্রেড করুন →', 'Upgrade to Agency →')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoResultView;
