import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mascot } from '@/components/Mascot';

const messages_bn = ['কিছু দারুণ তৈরি হচ্ছে...', 'প্রায় হয়ে এলো...', 'ম্যাজিক তৈরি হচ্ছে...', 'আর কয়েক সেকেন্ড...', 'শেষ ছোঁয়া দিচ্ছি...'];
const messages_en = ['Cooking something good...', 'Almost there...', 'Making magic happen...', 'Just a few more seconds...', 'Putting the finishing touches...'];

const RocketLoader = () => {
  const { lang } = useLanguage();
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const messages = lang === 'bn' ? messages_bn : messages_en;

  useEffect(() => {
    const interval = setInterval(() => setIdx(i => (i + 1) % messages.length), 3000);
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
      <Mascot variant="energetic" size={64} animate />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">{messages[idx]}</p>
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
