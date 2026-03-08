import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const AIChat = () => {
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: t('আসসালামু আলাইকুম! 👋 আমি AdDhoom AI। আপনার মার্কেটিং নিয়ে যেকোনো প্রশ্ন করুন!', "Hello! 👋 I'm AdDhoom AI. Ask me anything about your marketing!") },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const suggestions = [
    { bn: 'ঈদের ক্যাম্পেইন প্ল্যান করুন', en: 'Plan Eid campaign' },
    { bn: 'আমার ROAS কেন কম?', en: 'Why is my ROAS low?' },
    { bn: '৳৫,০০০ বাজেটে কীভাবে শুরু করব?', en: 'How to start with ৳5,000 budget?' },
    { bn: 'প্রতিযোগীর চেয়ে এগিয়ে থাকতে কী করব?', en: 'How to stay ahead of competitors?' },
  ];

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || typing) return;
    if (!activeWorkspace) {
      toast.error(t('প্রথমে একটি শপ তৈরি করুন', 'Please create a shop first'));
      return;
    }

    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setTyping(true);

    try {
      const response = await api.aiChat({
        workspace_id: activeWorkspace.id,
        conversation_id: conversationId,
        message: msg,
        language: lang,
      });

      if (response.error) {
        setMessages(prev => [...prev, { role: 'ai', text: t(response.error!.message_bn, response.error!.message_en) }]);
      } else if (response.data) {
        setMessages(prev => [...prev, { role: 'ai', text: response.data!.response }]);
        setConversationId(response.data.conversation_id);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: t('দুঃখিত, একটু পরে আবার চেষ্টা করুন।', 'Sorry, please try again later.') }]);
    } finally {
      setTyping(false);
    }
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
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm font-body-bn whitespace-pre-wrap ${
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
          <div ref={chatEndRef} />
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
              disabled={typing}
            />
            <button onClick={() => handleSend()} disabled={typing} className="bg-gradient-cta text-primary-foreground rounded-xl px-4 hover:scale-105 transition-transform disabled:opacity-70">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
