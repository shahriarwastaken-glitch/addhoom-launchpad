import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const AIChat = () => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: t('আসসালামু আলাইকুম! 👋 আমি AdDhoom AI। আপনার মার্কেটিং নিয়ে যেকোনো প্রশ্ন করুন!', "Hello! 👋 I'm AdDhoom AI. Ask me anything about your marketing!") },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const suggestions = [
    { bn: 'ঈদের ক্যাম্পেইন প্ল্যান করুন', en: 'Plan Eid campaign' },
    { bn: 'আমার ROAS কেন কম?', en: 'Why is my ROAS low?' },
    { bn: '৳৫,০০০ বাজেটে কীভাবে শুরু করব?', en: 'How to start with ৳5,000 budget?' },
    { bn: 'প্রতিযোগীর চেয়ে এগিয়ে থাকতে কী করব?', en: 'How to stay ahead of competitors?' },
  ];

  const handleSend = (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: t(
          'দারুণ প্রশ্ন! আপনার শপের জন্য আমি কিছু সাজেশন তৈরি করছি। ঈদের ২ সপ্তাহ আগে থেকে ক্যাম্পেইন শুরু করলে সবচেয়ে ভালো রেজাল্ট পাবেন। FOMO এবং Social Proof ফ্রেমওয়ার্ক ব্যবহার করুন।',
          'Great question! I\'m preparing suggestions for your shop. Starting campaigns 2 weeks before Eid gives the best results. Use FOMO and Social Proof frameworks.'
        ),
      }]);
      setTyping(false);
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <h2 className="text-2xl font-heading-bn font-bold text-foreground mb-4">
        {t('💬 AI চ্যাট', '💬 AI Chat')}
      </h2>

      <div className="flex-1 bg-card rounded-[20px] shadow-warm flex flex-col overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold mr-2 flex-shrink-0 mt-1">⚡</div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm font-body-bn ${
                msg.role === 'user'
                  ? 'bg-gradient-cta text-primary-foreground rounded-br-md'
                  : 'bg-secondary text-foreground rounded-bl-md'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold mr-2">⚡</div>
              <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="px-6 pb-4 flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSend(t(s.bn, s.en))}
                className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1.5 hover:bg-primary/20 transition-colors font-body-bn">
                {t(s.bn, s.en)}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={t('আপনার প্রশ্ন লিখুন...', 'Type your question...')}
              className="flex-1 p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-bn"
            />
            <button onClick={() => handleSend()} className="bg-gradient-cta text-primary-foreground rounded-xl px-4 hover:scale-105 transition-transform">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
