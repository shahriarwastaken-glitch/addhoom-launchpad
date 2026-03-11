import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Send, Plus, MessageSquare, Clock, Menu, X, Zap, Search,
  MoreVertical, Trash2, Edit3, Lightbulb, BarChart3,
  Calendar, Wallet, Target, Flame, Copy, ClipboardList, Sparkles, Store,
  Loader2,
} from 'lucide-react';
import ThinkingLoader from '@/components/loaders/ThinkingLoader';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { AnimatePresence, motion } from 'framer-motion';


// ─── Types ───
interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp?: string;
  ad_copy?: AdCopyCard | null;
}

interface AdCopyCard {
  headline: string;
  body: string;
  cta: string;
  framework: string;
  dhoom_score: number;
  platform: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  last_preview: string;
}

// ─── Helpers ───
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

function parseAdCopy(text: string): { cleanText: string; adCopy: AdCopyCard | null } {
  const match = text.match(/\[AD_COPY_START\]([\s\S]*?)\[AD_COPY_END\]/);
  if (!match) return { cleanText: text, adCopy: null };
  try {
    const adCopy = JSON.parse(match[1].trim());
    const cleanText = text.replace(/\[AD_COPY_START\][\s\S]*?\[AD_COPY_END\]/, '').trim();
    return { cleanText, adCopy };
  } catch {
    return { cleanText: text, adCopy: null };
  }
}

function relativeTime(ts: string, lang: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'bn' ? 'এইমাত্র' : 'Just now';
  if (mins < 60) return lang === 'bn' ? `${mins} মিনিট আগে` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === 'bn' ? `${hours} ঘণ্টা আগে` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return lang === 'bn' ? 'গতকাল' : 'Yesterday';
  if (days < 7) return lang === 'bn' ? `${days} দিন আগে` : `${days}d ago`;
  return new Date(ts).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric' });
}

function formatTime(ts?: string): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─── Suggestion Cards ───
const SUGGESTIONS = [
  { icon: Lightbulb, titleBn: 'বিজ্ঞাপন আইডিয়া দিন', titleEn: 'Ad Ideas', descBn: 'এই সপ্তাহে কোন ধরনের পোস্ট করবো?', descEn: 'What type of posts should I make this week?', promptBn: 'এই সপ্তাহে আমার শপের জন্য কোন ধরনের বিজ্ঞাপন পোস্ট করলে ভালো হবে? ৩-৫টা আইডিয়া দিন।', promptEn: 'What types of ad posts should I make for my shop this week? Give me 3-5 ideas.' },
  { icon: BarChart3, titleBn: 'ধুম স্কোর বুঝুন', titleEn: 'Dhoom Score', descBn: 'আমার বিজ্ঞাপনের স্কোর কেন কম?', descEn: 'Why is my ad score low?', promptBn: 'ধুম স্কোর কী এবং আমার বিজ্ঞাপনের স্কোর কীভাবে উন্নত করতে পারি?', promptEn: 'What is Dhoom Score and how can I improve my ad score?' },
  { icon: Calendar, titleBn: 'ক্যাম্পেইন প্ল্যান', titleEn: 'Campaign Plan', descBn: 'আগামী মাসের বিজ্ঞাপন পরিকল্পনা করুন', descEn: 'Plan next month\'s ads', promptBn: 'আগামী মাসের জন্য একটা পূর্ণাঙ্গ বিজ্ঞাপন ক্যাম্পেইন প্ল্যান করে দিন।', promptEn: 'Create a complete ad campaign plan for next month.' },
  { icon: Wallet, titleBn: 'বাজেট পরামর্শ', titleEn: 'Budget Advice', descBn: '৳৫,০০০ বাজেটে কীভাবে সেরা ফল পাবো?', descEn: 'How to get best results with ৳5,000?', promptBn: '৳৫,০০০ বাজেটে আমার শপের জন্য কীভাবে সবচেয়ে ভালো বিজ্ঞাপন রেজাল্ট পেতে পারি?', promptEn: 'How can I get the best ad results for my shop with a ৳5,000 budget?' },
  { icon: Target, titleBn: 'অডিয়েন্স টার্গেটিং', titleEn: 'Audience Targeting', descBn: 'আমার পণ্যের জন্য কোন অডিয়েন্স ভালো?', descEn: 'Which audience fits my product?', promptBn: 'আমার পণ্যের জন্য কোন অডিয়েন্স টার্গেট করলে সবচেয়ে ভালো হবে? Facebook-এ কীভাবে সেট করবো?', promptEn: 'Which audience should I target for my products? How to set it up on Facebook?' },
  { icon: Flame, titleBn: 'প্রতিযোগী কৌশল', titleEn: 'Competitor Strategy', descBn: 'প্রতিযোগীদের থেকে এগিয়ে থাকার উপায়', descEn: 'Ways to stay ahead of competitors', promptBn: 'আমার ইন্ডাস্ট্রিতে প্রতিযোগীদের থেকে এগিয়ে থাকার জন্য কোন মার্কেটিং কৌশল ব্যবহার করবো?', promptEn: 'What marketing strategies should I use to stay ahead of competitors in my industry?' },
];

const QUICK_PILLS = [
  { icon: ClipboardList, labelBn: 'বিজ্ঞাপন লিখুন', labelEn: 'Write Ad', promptBn: 'আমার শপের জন্য একটা Facebook বিজ্ঞাপন লিখে দিন', promptEn: 'Write a Facebook ad for my shop' },
  { icon: Calendar, labelBn: 'ক্যালেন্ডার প্ল্যান', labelEn: 'Calendar Plan', promptBn: 'এই মাসের কনটেন্ট ক্যালেন্ডার প্ল্যান করুন', promptEn: 'Plan this month\'s content calendar' },
  { icon: Wallet, labelBn: 'বাজেট পরামর্শ', labelEn: 'Budget Advice', promptBn: 'আমার বাজেটে সবচেয়ে ভালো রিটার্ন কীভাবে পাবো?', promptEn: 'How to get the best return on my budget?' },
  { icon: Target, labelBn: 'টার্গেটিং', labelEn: 'Targeting', promptBn: 'আমার পণ্যের জন্য সেরা অডিয়েন্স টার্গেটিং কী?', promptEn: 'What\'s the best audience targeting for my products?' },
  { icon: Sparkles, labelBn: 'হুক আইডিয়া', labelEn: 'Hook Ideas', promptBn: '৫টা আকর্ষণীয় বিজ্ঞাপন হুক আইডিয়া দিন', promptEn: 'Give me 5 catchy ad hook ideas' },
];

// ─── Ad Copy Card Component ───
const AdCopyCardView = ({ ad, t }: { ad: AdCopyCard; t: (bn: string, en: string) => string }) => (
  <div className="my-3 bg-card rounded-xl border-l-[3px] border-l-primary border border-border p-4 space-y-2">
    <p className="text-sm font-bold text-foreground font-heading-bn">{ad.headline}</p>
    <p className="text-sm text-muted-foreground leading-relaxed">{ad.body}</p>
    <p className="text-sm font-semibold text-primary">{ad.cta}</p>
    <div className="flex items-center gap-2 pt-2 border-t border-border">
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
        Dhoom {ad.dhoom_score}/100
      </span>
      <span className="text-[10px] text-muted-foreground">{ad.platform} • {ad.framework}</span>
    </div>
    <div className="flex gap-2 pt-1">
      <button
        onClick={() => { navigator.clipboard.writeText(`${ad.headline}\n\n${ad.body}\n\n${ad.cta}`); toast.success(t('কপি হয়েছে!', 'Copied!')); }}
        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-secondary border border-border hover:border-primary/50 transition-colors text-muted-foreground"
      >
        <Copy size={10} /> {t('কপি করুন', 'Copy')}
      </button>
    </div>
  </div>
);

// ─── Main Component ───
const AIChat = () => {
  const { t, lang } = useLanguage();
  const { activeWorkspace, session, workspaces, setActiveWorkspaceId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuConvId, setMenuConvId] = useState<string | null>(null);
  const [hasSummary, setHasSummary] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  // Load conversations
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
        setHasSummary(!!data.conversation.summary);
        const msgs = (data.conversation.messages || []).map((m: any) => {
          const { cleanText, adCopy } = parseAdCopy(m.content);
          return { ...m, content: cleanText, ad_copy: adCopy };
        });
        setMessages(msgs);
        setDrawerOpen(false);
      }
    } catch {
      toast.error(t('কথোপকথন লোড হয়নি', 'Failed to load conversation'));
    }
  };

  const deleteConversation = async (convId: string) => {
    try {
      await supabase.functions.invoke('ai-chat', {
        body: { workspace_id: activeWorkspace?.id, conversation_id: convId, action: 'delete_conversation' },
      });
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (conversationId === convId) startNewChat();
      toast.success(t('মুছে ফেলা হয়েছে', 'Deleted'));
    } catch {
      toast.error(t('মুছতে পারিনি', 'Failed to delete'));
    }
    setMenuConvId(null);
  };

  const renameConversation = async (convId: string) => {
    if (!editTitle.trim()) return;
    try {
      await supabase.functions.invoke('ai-chat', {
        body: { workspace_id: activeWorkspace?.id, conversation_id: convId, action: 'rename_conversation', title: editTitle.trim() },
      });
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: editTitle.trim() } : c));
    } catch { /* ignore */ }
    setEditingConvId(null);
    setEditTitle('');
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setInput('');
    setHasSummary(false);
    setDrawerOpen(false);
  };

  // ─── Streaming Send ───
  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || streaming) return;
    if (!activeWorkspace) {
      toast.error(t('প্রথমে একটি শপ তৈরি করুন', 'Please create a shop first'));
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = '48px';

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantText = '';

    try {
      const token = session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        toast.error(t('সেশন শেষ হয়েছে। আবার লগইন করুন।', 'Session expired. Please log in again.'));
        setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
        setStreaming(false);
        setInput(msg);
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          conversation_id: conversationId,
          message: msg,
          language: lang,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast.error(t('অনুরোধ সীমা ছাড়িয়ে গেছে। একটু পরে চেষ্টা করুন।', 'Rate limit exceeded. Try again shortly.'));
        } else if (resp.status === 402) {
          toast.error(t('AI ক্রেডিট শেষ। টপ আপ করুন।', 'AI credits exhausted. Please top up.'));
        } else {
          toast.error(errData.message_bn || t('সমস্যা হয়েছে', 'Something went wrong'));
        }
        setMessages(prev => prev.filter((_, i) => i !== prev.length - 1));
        setStreaming(false);
        setInput(msg);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);

            // Handle meta events (conversation_id)
            if (parsed.meta) {
              if (parsed.meta.conversation_id && !conversationId) {
                setConversationId(parsed.meta.conversation_id);
              }
              if (parsed.meta.final) {
                // Reload conversations to get updated title
                loadConversations();
              }
              continue;
            }

            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantText += content;
              const { cleanText, adCopy } = parseAdCopy(assistantText);
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'model') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cleanText, ad_copy: adCopy } : m);
                }
                return [...prev, { role: 'model', content: cleanText, ad_copy: adCopy, timestamp: new Date().toISOString() }];
              });
            }
          } catch {
            // Partial JSON, put back
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.meta) {
              if (parsed.meta.conversation_id) setConversationId(parsed.meta.conversation_id);
              if (parsed.meta.final) loadConversations();
              continue;
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantText += content;
              const { cleanText, adCopy } = parseAdCopy(assistantText);
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'model') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cleanText, ad_copy: adCopy } : m);
                }
                return [...prev, { role: 'model', content: cleanText, ad_copy: adCopy, timestamp: new Date().toISOString() }];
              });
            }
          } catch { /* ignore */ }
        }
      }

    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error('Chat error:', e);
      setMessages(prev => [...prev, { role: 'model', content: t('দুঃখিত, একটু পরে আবার চেষ্টা করুন।', 'Sorry, please try again later.'), timestamp: new Date().toISOString() }]);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, activeWorkspace, conversationId, messages, lang, t]);

  // Textarea auto-resize
  const handleInputChange = (val: string) => {
    setInput(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Search in conversation
  const searchMatches = searchQuery.trim()
    ? messages.reduce<number[]>((acc, m, i) => {
      if (m.content.toLowerCase().includes(searchQuery.toLowerCase())) acc.push(i);
      return acc;
    }, [])
    : [];

  const isWelcome = messages.length === 0;
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  

  return (
    <div className="flex h-[calc(100dvh-3.5rem-3.5rem)] md:h-[calc(100dvh-3.5rem)] w-full gap-0">
      {/* ─── LEFT SIDEBAR ─── */}
      <div className="hidden lg:flex flex-col w-[280px] bg-card border-r border-border flex-shrink-0">
        {/* Sidebar Header */}
        <div className="p-5 pb-4">
          <h2 className="text-lg font-bold font-heading-bn text-foreground">DhoomAi</h2>
          <p className="text-xs text-muted-foreground font-body-bn">
            {t('আপনার বিজ্ঞাপন বিশেষজ্ঞ', 'Your ad expert')}
          </p>
          <button
            onClick={startNewChat}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[10px] border-[1.5px] border-border text-sm font-semibold font-heading-bn text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus size={16} /> {t('নতুন কথোপকথন', 'New Conversation')}
          </button>
        </div>
        <div className="h-px bg-border" />

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConvs ? (
            <div className="p-4 text-center text-muted-foreground text-xs">{t('লোড হচ্ছে...', 'Loading...')}</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-body-bn">{t('কোনো কথোপকথন নেই', 'No conversations yet')}</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`group relative rounded-[10px] p-2.5 px-3 cursor-pointer transition-colors ${
                  conversationId === conv.id
                    ? 'bg-primary/[0.08] border-l-[3px] border-l-primary'
                    : 'hover:bg-secondary'
                }`}
                onClick={() => { if (editingConvId !== conv.id) loadConversation(conv.id); }}
              >
                {editingConvId === conv.id ? (
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={() => renameConversation(conv.id)}
                    onKeyDown={e => { if (e.key === 'Enter') renameConversation(conv.id); if (e.key === 'Escape') setEditingConvId(null); }}
                    autoFocus
                    className="w-full text-sm font-semibold bg-transparent border-b border-primary outline-none font-heading-bn text-foreground"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <p className="text-sm font-semibold text-foreground truncate font-heading-bn pr-6">{conv.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_preview}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock size={10} /> {relativeTime(conv.updated_at, lang)}
                    </p>
                  </>
                )}

                {/* Context menu */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); setMenuConvId(menuConvId === conv.id ? null : conv.id); }}
                    className="p-1 rounded-md hover:bg-border/50"
                  >
                    <MoreVertical size={14} className="text-muted-foreground" />
                  </button>
                  {menuConvId === conv.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setMenuConvId(null); }} />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                        <button
                          onClick={e => { e.stopPropagation(); setEditingConvId(conv.id); setEditTitle(conv.title); setMenuConvId(null); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-secondary flex items-center gap-2 text-foreground"
                        >
                          <Edit3 size={12} /> {t('শিরোনাম পরিবর্তন', 'Rename')}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); if (confirm(t('মুছে ফেলতে চান?', 'Delete this conversation?'))) deleteConversation(conv.id); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-secondary flex items-center gap-2 text-destructive"
                        >
                          <Trash2 size={12} /> {t('মুছুন', 'Delete')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── MOBILE DRAWER ─── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] z-50 bg-card shadow-xl flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-heading-bn font-bold text-foreground">{t('কথোপকথন', 'Conversations')}</h3>
                <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg hover:bg-secondary">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>
              <div className="p-3">
                <button onClick={startNewChat} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[10px] border-[1.5px] border-border text-sm font-semibold font-heading-bn hover:border-primary hover:text-primary transition-colors">
                  <Plus size={16} /> {t('নতুন কথোপকথন', 'New Conversation')}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`w-full text-left rounded-[10px] p-2.5 transition-colors ${
                      conversationId === conv.id ? 'bg-primary/[0.08] border-l-[3px] border-l-primary' : 'hover:bg-secondary'
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground truncate font-heading-bn">{conv.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{relativeTime(conv.updated_at, lang)}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── MAIN CHAT AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-card">
        {/* Chat Header */}
        <div className="h-16 px-4 md:px-6 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setDrawerOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-secondary">
              <Menu size={18} className="text-muted-foreground" />
            </button>
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <img src="/mascot/mascot-ai.png" alt="DhoomAi" className="w-11 h-11 rounded-full object-contain" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[hsl(var(--brand-green))] border-2 border-card animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold text-foreground font-heading-bn">DhoomAi</h3>
              <p className="text-xs text-muted-foreground font-body-bn truncate">
                {t('আপনার বিজ্ঞাপন বিশেষজ্ঞ • সবসময় অনলাইন', 'Your ad expert • Always online')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              <Search size={16} />
            </button>
            <div className="relative">
              <button onClick={() => setShowHeaderMenu(!showHeaderMenu)} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
                <MoreVertical size={16} />
              </button>
              {showHeaderMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                    <button onClick={() => { if (confirm(t('চ্যাট ক্লিয়ার করবেন?', 'Clear chat?'))) { startNewChat(); setShowHeaderMenu(false); } }} className="w-full text-left px-3 py-2 text-xs hover:bg-secondary text-foreground flex items-center gap-2">
                      <Trash2 size={12} /> {t('চ্যাট ক্লিয়ার', 'Clear Chat')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-2">
                <Search size={14} className="text-muted-foreground flex-shrink-0" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('কথোপকথনে খুঁজুন...', 'Search in conversation...')}
                  className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
                {searchQuery && (
                  <span className="text-[11px] text-muted-foreground">{searchMatches.length} {t('ফলাফল', 'results')}</span>
                )}
                <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="p-1 hover:bg-secondary rounded">
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 bg-secondary/30" style={{ scrollBehavior: 'smooth' }}>
          {/* Shop Context Banner */}
          {activeWorkspace && (
            <div className="mb-4 bg-card rounded-[10px] border border-border p-2.5 px-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Store size={16} className="text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] text-foreground font-heading-bn truncate">
                    {activeWorkspace.shop_name} {activeWorkspace.platform ? `• ${activeWorkspace.platform}` : ''} {activeWorkspace.industry ? `• ${activeWorkspace.industry}` : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('ধুম AI আপনার শপের তথ্য জানে', 'Dhoom AI knows your shop data')}
                  </p>
                </div>
              </div>
              {workspaces.length > 1 && (
                <button className="text-[12px] text-primary font-heading-bn hover:underline flex-shrink-0" onClick={() => setDrawerOpen(true)}>
                  {t('শপ পরিবর্তন', 'Switch Shop')}
                </button>
              )}
            </div>
          )}

          {isWelcome ? (
            /* ─── Empty State ─── */
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--brand-yellow))] flex items-center justify-center text-primary-foreground text-lg font-bold font-heading-bn shadow-lg">
                  ধু
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[hsl(var(--brand-green))] border-2 border-card animate-pulse" />
              </div>
              <h2 className="text-[22px] font-bold font-heading-bn text-foreground mb-1">
                {t('আমি ধুম AI', 'I\'m Dhoom AI')} 👋
              </h2>
              <p className="text-base text-muted-foreground font-heading-bn mb-8">
                {activeWorkspace ? t(`${activeWorkspace.shop_name}-এর জন্য কীভাবে সাহায্য করতে পারি?`, `How can I help ${activeWorkspace.shop_name}?`) : t('কীভাবে সাহায্য করতে পারি?', 'How can I help?')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSend(t(s.promptBn, s.promptEn))}
                    className="text-left bg-card border-[1.5px] border-border rounded-[14px] p-3.5 hover:border-primary/50 hover:bg-primary/[0.02] transition-all"
                  >
                    <s.icon size={20} className="text-primary mb-1.5" />
                    <p className="text-sm font-bold font-heading-bn text-foreground">{t(s.titleBn, s.titleEn)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(s.descBn, s.descEn)}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            /* ─── Message Bubbles ─── */
            <>
              {/* Summary divider */}
              {hasSummary && (
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-border" />
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 border border-border">
                    <Sparkles size={12} className="text-primary" />
                    <span className="text-[11px] text-muted-foreground font-body-bn">
                      {t('আগের কথোপকথন সারসংক্ষেপ করা হয়েছে', 'Previous messages summarized')}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              {messages.map((msg, i) => {
                const isHighlighted = searchQuery && searchMatches.includes(i);
                return (
                  <div key={i} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--brand-yellow))] flex items-center justify-center text-primary-foreground text-[10px] font-bold mr-2 flex-shrink-0 mt-1 font-heading-bn">
                        ধু
                      </div>
                    )}
                    <div className={`max-w-[80%] sm:max-w-[70%] ${msg.role === 'user' ? 'max-w-[70%]' : ''}`}>
                      <div className={`rounded-[20px] px-[18px] py-3 text-[15px] leading-[1.65] font-body-bn ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-[4px]'
                          : 'bg-card text-foreground rounded-bl-[4px] border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                      } ${isHighlighted ? 'ring-2 ring-primary/40' : ''}`}>
                        {msg.role === 'model' ? (
                          <>
                            <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>p:last-child]:mb-0">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            {msg.ad_copy && <AdCopyCardView ad={msg.ad_copy} t={t} />}
                          </>
                        ) : (
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        )}
                      </div>
                      <p className={`text-[10px] text-muted-foreground mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {streaming && messages[messages.length - 1]?.role !== 'model' && (
                <div className="flex mb-4 justify-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--brand-yellow))] flex items-center justify-center text-primary-foreground text-[10px] font-bold mr-2 font-heading-bn">
                    ধু
                  </div>
                  <div className="bg-card rounded-[20px] rounded-bl-[4px] border border-border">
                    <ThinkingLoader />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* ─── Input Area ─── */}
        <div className="border-t border-border bg-card px-4 md:px-6 py-3 flex-shrink-0">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ধুম AI-কে জিজ্ঞেস করুন...', 'Ask Dhoom AI...')}
              className="flex-1 min-h-[48px] max-h-[160px] resize-none bg-secondary/50 border-[1.5px] border-border rounded-2xl px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground font-body-bn outline-none focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] transition-all overflow-y-auto"
              disabled={streaming}
              rows={1}
            />
            <button
              onClick={() => handleSend()}
              disabled={streaming || !input.trim()}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 disabled:bg-border disabled:shadow-none disabled:cursor-not-allowed bg-primary text-primary-foreground shadow-[0_4px_12px_hsl(var(--primary)/0.3)] hover:scale-105 active:scale-95"
            >
              {streaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>

          {/* Quick action pills */}
          <div className="hidden sm:flex items-center gap-2 mt-2.5 overflow-x-auto scrollbar-hide">
            {QUICK_PILLS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(t(p.promptBn, p.promptEn))}
                disabled={streaming}
                className="flex items-center gap-1 whitespace-nowrap text-xs px-3 py-1.5 rounded-full border border-border bg-secondary/50 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors font-body-bn disabled:opacity-50"
              >
                <p.icon size={12} /> {t(p.labelBn, p.labelEn)}
              </button>
            ))}
          </div>

          {/* Helper text */}
          <div className="hidden sm:flex items-center justify-between mt-2">
            <p className="text-[10px] text-muted-foreground">
              {t('AI টোকেন সংরক্ষণে লম্বা কথোপকথন সারসংক্ষেপ হয়', 'Long conversations are auto-summarized to save tokens')}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Shift+Enter = {t('নতুন লাইন', 'new line')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
