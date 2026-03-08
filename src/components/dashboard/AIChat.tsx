import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Send, Plus, MessageSquare, Zap, Clock } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp?: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

const AIChat = () => {
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Load conversation list
  useEffect(() => {
    if (!activeWorkspace) return;
    loadConversations();
  }, [activeWorkspace]);

  const loadConversations = async () => {
    if (!activeWorkspace) return;
    setLoadingConvs(true);
    try {
      const { data } = await supabase.functions.invoke('ai-chat', {
        body: { workspace_id: activeWorkspace.id, action: 'list_conversations' },
      });
      setConversations(data?.conversations || []);
    } catch { /* ignore */ }
    setLoadingConvs(false);
  };

  const loadConversation = async (convId: string) => {
    try {
      const { data } = await supabase.functions.invoke('ai-chat', {
        body: { workspace_id: activeWorkspace?.id, conversation_id: convId, action: 'load_conversation' },
      });
      if (data?.conversation) {
        setConversationId(convId);
        setMessages(data.conversation.messages || []);
      }
    } catch {
      toast.error(t('কথোপকথন লোড হয়নি', 'Failed to load conversation'));
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setInput('');
  };

  const suggestions = [
    { bn: 'ঈদের ক্যাম্পেইন কীভাবে প্ল্যান করব?', en: 'How to plan an Eid campaign?' },
    { bn: 'আমার ROAS কীভাবে বাড়াব?', en: 'How to increase my ROAS?' },
    { bn: '৳৫,০০০ বাজেটে কোথা থেকে শুরু করব?', en: 'Where to start with ৳5,000 budget?' },
    { bn: 'Facebook নাকি Google — কোনটা ভালো?', en: 'Facebook or Google — which is better?' },
  ];

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || typing) return;
    if (!activeWorkspace) {
      toast.error(t('প্রথমে একটি শপ তৈরি করুন', 'Please create a shop first'));
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          workspace_id: activeWorkspace.id,
          conversation_id: conversationId,
          message: msg,
          language: lang,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setMessages(prev => [...prev, { role: 'model', content: data.response, timestamp: new Date().toISOString() }]);
        if (data.conversation_id && !conversationId) {
          setConversationId(data.conversation_id);
          loadConversations(); // Refresh list
        }
      } else {
        setMessages(prev => [...prev, { role: 'model', content: data?.message_bn || t('দুঃখিত, সমস্যা হয়েছে।', 'Sorry, something went wrong.') }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'model', content: t('দুঃখিত, একটু পরে আবার চেষ্টা করুন।', 'Sorry, please try again later.') }]);
    } finally {
      setTyping(false);
    }
  };

  const formatTime = (ts?: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('আজ', 'Today');
    if (diffDays === 1) return t('গতকাল', 'Yesterday');
    return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const isWelcome = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-10rem)] sm:h-[calc(100vh-8rem)] gap-4 max-w-6xl mx-auto">
      {/* LEFT PANEL — Conversation List */}
      <div className="hidden lg:flex flex-col w-72 bg-card rounded-2xl shadow-warm overflow-hidden flex-shrink-0">
        <div className="p-4 border-b border-border">
          <button
            onClick={startNewChat}
            className="w-full bg-gradient-cta text-primary-foreground rounded-xl py-2.5 font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity font-body-bn"
          >
            <Plus size={16} /> {t('নতুন চ্যাট', 'New Chat')}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-4 text-center text-muted-foreground text-xs">{t('লোড হচ্ছে...', 'Loading...')}</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-body-bn">{t('কোনো কথোপকথন নেই', 'No conversations yet')}</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-secondary/50 transition-colors ${
                  conversationId === conv.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                }`}
              >
                <p className="text-sm font-medium text-foreground truncate font-body-bn">{conv.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock size={10} /> {formatDate(conv.updated_at)}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL — Active Chat */}
      <div className="flex-1 flex flex-col bg-card rounded-2xl shadow-warm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground font-bold text-sm">⚡</div>
          <div>
            <h3 className="text-sm font-bold text-foreground font-heading-bn">AdDhoom AI</h3>
            <p className="text-[10px] text-muted-foreground font-body-bn">
              {activeWorkspace ? `${activeWorkspace.shop_name} • ` : ''}{t('মার্কেটিং এক্সপার্ট', 'Marketing Expert')}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {isWelcome ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center text-primary-foreground text-2xl mb-4 shadow-lg">⚡</div>
              <h2 className="text-xl font-heading-bn font-bold text-foreground mb-1">
                {t('নমস্কার! আমি AdDhoom AI 👋', 'Hello! I\'m AdDhoom AI 👋')}
              </h2>
              <p className="text-sm text-muted-foreground font-body-bn mb-6">
                {t('আপনার মার্কেটিং নিয়ে যেকোনো প্রশ্ন করুন', 'Ask me anything about your marketing')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md w-full">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(t(s.bn, s.en))}
                    className="text-left text-xs bg-secondary hover:bg-secondary/70 text-foreground rounded-xl px-4 py-3 transition-colors font-body-bn border border-border/50"
                  >
                    {t(s.bn, s.en)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold mr-2 flex-shrink-0 mt-1">⚡</div>
                  )}
                  <div className={`max-w-[85%] sm:max-w-[75%]`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm font-body-bn ${
                      msg.role === 'user'
                        ? 'bg-gradient-cta text-primary-foreground rounded-br-md'
                        : 'bg-secondary text-foreground rounded-bl-md'
                    }`}>
                      {msg.role === 'model' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )}
                    </div>
                    <p className={`text-[9px] text-muted-foreground mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground text-xs font-bold mr-2">⚡</div>
                  <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={t('আপনার প্রশ্ন লিখুন...', 'Type your question...')}
              className="flex-1 p-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-bn"
              disabled={typing}
            />
            <button
              onClick={() => handleSend()}
              disabled={typing || !input.trim()}
              className="bg-gradient-cta text-primary-foreground rounded-xl px-4 hover:scale-105 transition-transform disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
