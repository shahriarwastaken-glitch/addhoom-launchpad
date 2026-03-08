import { useLanguage } from '@/contexts/LanguageContext';

interface VideoLoaderProps {
  progress?: number;
}

const VideoLoader = ({ progress }: VideoLoaderProps) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <span className="text-4xl animate-spin" style={{ animationDuration: '2s' }}>🎬</span>
      <p className="text-sm font-medium text-foreground">
        {t('ভিডিও রেন্ডার হচ্ছে... এটা ১-২ মিনিট সময় নিতে পারে', 'Rendering video... This may take 1-2 minutes')}
      </p>
      {progress !== undefined && (
        <div className="w-48 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-gradient-brand rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default VideoLoader;
