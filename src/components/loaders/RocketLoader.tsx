import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Rocket } from 'lucide-react';

const messages_bn = ['AI ভাবছে...', 'কপি লেখা হচ্ছে...', 'প্রায় হয়ে এলো...'];
const messages_en = ['AI is thinking...', 'Writing copy...', 'Almost done...'];

const RocketLoader = () => {
  const { lang } = useLanguage();
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const messages = lang === 'bn' ? messages_bn : messages_en;

  useEffect(() => {
    const interval = setInterval(() => setIdx(i => (i + 1) % messages.length), 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => (p >= 90 ? 90 : p + Math.random() * 8));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <Rocket size={36} className="text-primary animate-bounce" />
      <p className="text-sm font-medium text-foreground animate-pulse">{messages[idx]}</p>
      <div className="w-48 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-gradient-brand rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default RocketLoader;
