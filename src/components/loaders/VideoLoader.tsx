import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mascot } from '@/components/Mascot';

const messages_bn = ['ভিডিও রেন্ডার হচ্ছে...', 'ম্যাজিক তৈরি হচ্ছে...', 'প্রায় হয়ে এলো...'];
const messages_en = ['Rendering video...', 'Making magic happen...', 'Almost there...'];

interface VideoLoaderProps {
  progress?: number;
}

const VideoLoader = ({ progress }: VideoLoaderProps) => {
  const { t, lang } = useLanguage();
  const [idx, setIdx] = useState(0);
  const messages = lang === 'bn' ? messages_bn : messages_en;

  useEffect(() => {
    const interval = setInterval(() => setIdx(i => (i + 1) % messages.length), 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <Mascot variant="energetic" size={64} animate />
      <p className="text-sm font-medium text-muted-foreground">{messages[idx]}</p>
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
