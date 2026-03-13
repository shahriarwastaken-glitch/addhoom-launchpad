import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUpgrade } from '@/contexts/UpgradeContext';
import { useSearchParams } from 'react-router-dom';
import { Film, Sparkles, ImageIcon } from 'lucide-react';
import AIMotionTab from './video/AIMotionTab';
import VideoHistory from './video/VideoHistory';

type VideoMode = 'text_to_video' | 'animate_image';

const VideoAd = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { showUpgrade } = useUpgrade();
  const [searchParams, setSearchParams] = useSearchParams();

  const modeParam = searchParams.get('mode');
  const preloadImage = searchParams.get('image_url');

  const [activeMode, setActiveMode] = useState<VideoMode>(
    modeParam === 'animate' ? 'animate_image' : 'text_to_video'
  );

  const plan = profile?.plan || 'pro';

  // Check plan access
  useEffect(() => {
    if (plan === 'free') {
      showUpgrade('video');
    }
  }, [plan, showUpgrade]);

  // Sync mode from URL params
  useEffect(() => {
    if (modeParam === 'animate') {
      setActiveMode('animate_image');
    }
  }, [modeParam]);

  // Free users see upgrade gate
  if (plan === 'free') {
    return (
      <div className="h-full flex items-center justify-center text-center px-8">
        <div>
          <span className="text-5xl mb-4 block">🎬</span>
          <h2 className="text-2xl font-bold font-heading-bn text-foreground mb-2">{t('ভিডিও জেনারেটর', 'Video Generator')}</h2>
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
      {/* Mode Toggle */}
      <div className="shrink-0 px-4 sm:px-6 pt-4 pb-2">
        <div className="mb-1">
          <h1 className="text-lg font-bold font-heading-bn text-foreground">{t('ভিডিও জেনারেটর', 'Video Generator')}</h1>
          <p className="text-xs text-muted-foreground font-heading-bn">
            {t('আপনার ইমেজকে ভিডিও অ্যাডে পরিণত করুন, অথবা টেক্সট প্রম্পট থেকে তৈরি করুন।', 'Turn your images into video ads, or generate from a text prompt.')}
          </p>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => { setActiveMode('text_to_video'); setSearchParams({}); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeMode === 'text_to_video'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Film size={14} />
            {t('টেক্সট টু ভিডিও', 'Text to Video')}
          </button>
          <button
            onClick={() => { setActiveMode('animate_image'); setSearchParams({}); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeMode === 'animate_image'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <ImageIcon size={14} />
            {t('ইমেজ অ্যানিমেট', 'Animate Image')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <AIMotionTab
          mode={activeMode}
          preloadImageUrl={activeMode === 'animate_image' ? preloadImage || undefined : undefined}
        />
      </div>
    </div>
  );
};

export default VideoAd;
