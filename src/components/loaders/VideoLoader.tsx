import { useLanguage } from '@/contexts/LanguageContext';
import { Film } from 'lucide-react';

interface VideoLoaderProps {
  progress?: number;
}

const VideoLoader = ({ progress }: VideoLoaderProps) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <Film size={36} className="text-primary animate-spin" style={{ animationDuration: '2s' }} />
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
