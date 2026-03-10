import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, RefreshCw, Star, ChevronDown, Image as ImageIcon, Check, Rocket, Zap, BarChart3, RotateCcw, Lightbulb, Flame, TrendingUp, Download, Clock, Trash2, FolderPlus, FolderOpen, CheckCircle2, Calendar, X, AlertTriangle } from 'lucide-react';
import FeatureTooltip from '@/components/ui/FeatureTooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import type { AdResult, GeneratorMode } from './types';
import { LOADING_TIPS, LOADING_TIPS_EN } from './types';
import { getImageHistory, type ImageHistoryEntry } from './AdGeneratorPage';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

interface ResultsPanelProps {
  mode: GeneratorMode;
  results: AdResult[];
  setResults: React.Dispatch<React.SetStateAction<AdResult[]>>;
  generating: boolean;
  onRegenerate: () => void;
  onSwitchToImage: (ad: AdResult) => void;
  onRemix: (ad: AdResult) => void;
  onLoadHistory?: (results: AdResult[]) => void;
  projectId?: string | null;
  imageHistoryOpen?: boolean;
  onToggleImageHistory?: () => void;
  onSchedule?: (ad: AdResult) => void;
  showProjectPrompt?: boolean;
  onAssignAllToProject?: (projectId: string, projectName: string) => void;
  onDismissProjectPrompt?: () => void;
}

interface ProjectOption {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

const ResultsPanel = ({ mode, results, setResults, generating, onRegenerate, onSwitchToImage, onRemix, onLoadHistory, projectId, imageHistoryOpen, onToggleImageHistory, onSchedule, showProjectPrompt, onAssignAllToProject, onDismissProjectPrompt }: ResultsPanelProps) => {
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [progress, setProgress] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [tipIdx] = useState(() => Math.floor(Math.random() * LOADING_TIPS.length));
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<ImageHistoryEntry[]>(() => getImageHistory());
  const showHistory = imageHistoryOpen ?? false;

  const loadingMsgs = mode === 'copy'
    ? [t('চিন্তা করছি...', 'Thinking...'), t('লিখছি...', 'Writing...'), t('স্কোর করছি...', 'Scoring...')]
    : [t('প্রম্পট তৈরি হচ্ছে...', 'Creating prompt...'), t('AI ছবি আঁকছে...', 'AI drawing...'), t('ফিনিশিং টাচ...', 'Finishing touches...')];

  useEffect(() => {
    if (!generating) { setProgress(0); setShowTip(false); return; }
    setProgress(0);
    const progressInterval = setInterval(() => setProgress(p => p >= 90 ? 90 : p + Math.random() * 8), 400);
    const msgInterval = setInterval(() => setLoadingMsgIdx(i => (i + 1) % 3), 1800);
    const tipTimeout = setTimeout(() => setShowTip(true), 3000);
    return () => { clearInterval(progressInterval); clearInterval(msgInterval); clearTimeout(tipTimeout); };
  }, [generating]);

  const copyAll = () => {
    const text = results.map(a => `${a.headline}\n\n${a.body}\n\n${a.cta}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    toast.success(t('সব কপি হয়েছে!', 'All copied!'));
  };

  const copySingle = (ad: AdResult) => {
    // For image ads, copy the actual prompt (stored in body = sd_prompt), not the "Version X" headline
    const textToCopy = ad.image_url
      ? (ad.body || ad.headline)
      : `${ad.headline}\n\n${ad.body}\n\n${ad.cta}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(ad.id || '');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleWinner = async (ad: AdResult) => {
    if (!ad.id) return;
    const newVal = !ad.is_winner;
    // Update in the correct table based on whether it's an image or copy ad
    const table = ad.image_url ? 'ad_images' : 'ad_creatives';
    const { error } = await supabase.from(table).update({ is_winner: newVal } as any).eq('id', ad.id);
    if (!error) {
      setResults(prev => {
        const updated = prev.map(a => a.id === ad.id ? { ...a, is_winner: newVal } : a);
        // Sort winners to the top
        return updated.sort((a, b) => (b.is_winner ? 1 : 0) - (a.is_winner ? 1 : 0));
      });
      toast.success(newVal
        ? t('বিজয়ী চিহ্নিত! রিমিক্সে এই প্যাটার্ন ব্যবহার হবে।', 'Marked as winner! Remix will use this pattern.')
        : t('বিজয়ী সরানো হয়েছে', 'Removed winner'));
    }
  };

  const downloadImage = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${name}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success(t('ডাউনলোড হচ্ছে...', 'Downloading...'));
    } catch {
      toast.error(t('ডাউনলোড ব্যর্থ হয়েছে', 'Download failed'));
    }
  };

  const displayNum = (n: number) => lang === 'bn' ? toBengali(n) : n;

  const loadFromHistory = (entry: ImageHistoryEntry) => {
    if (onLoadHistory) {
      onLoadHistory(entry.results);
    } else {
      setResults(entry.results);
    }
    toast.success(t('হিস্ট্রি থেকে লোড হয়েছে', 'Loaded from history'));
  };

  const clearHistory = () => {
    localStorage.removeItem('dhoom_image_history');
    setImageHistory([]);
    toast.success(t('হিস্ট্রি মুছে ফেলা হয়েছে', 'History cleared'));
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // IMAGE HISTORY VIEW (shown regardless of results when toggled)
  if (!generating && showHistory) {
    return (
      <div className="h-full overflow-y-auto flex flex-col items-center justify-center text-center px-8">
        <div className="w-full max-w-md text-left">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-bold font-heading-bn text-foreground flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              {t('ইমেজ হিস্ট্রি', 'Image History')}
            </h4>
            <button
              onClick={() => onToggleImageHistory?.()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          {imageHistory.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-end mb-2">
                <button
                  onClick={clearHistory}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <Trash2 size={12} /> {t('মুছুন', 'Clear')}
                </button>
              </div>
              {imageHistory.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => { loadFromHistory(entry); onToggleImageHistory?.(); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary/80 transition-all text-left group"
                >
                  {entry.results[0]?.image_url && (
                    <img src={entry.results[0].image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold font-heading-bn text-foreground truncate">{entry.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.results.length} {t('ভার্শন', 'versions')} · {formatTime(entry.timestamp)}
                    </p>
                  </div>
                  <RotateCcw size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock size={40} className="mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-sm font-heading-bn text-muted-foreground mb-1">{t('এখনো কোনো ইমেজ হিস্ট্রি নেই', 'No image history yet')}</p>
              <p className="text-xs text-muted-foreground/70">{t('ইমেজ জেনারেট করলে এখানে সেভ হবে', 'Generated images will be saved here')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // EMPTY STATE
  if (!generating && results.length === 0) {
    return (
      <div className="h-full overflow-y-auto flex flex-col items-center justify-center text-center px-8">
        <div className="relative mb-6">
          <div className="w-24 h-28 bg-secondary rounded-lg relative shadow-warm">
            <div className="absolute inset-x-4 top-3 space-y-2">
              <div className="h-1.5 bg-border rounded-full" />
              <div className="h-1.5 bg-border rounded-full w-3/4" />
              <div className="h-1.5 bg-border rounded-full w-1/2" />
            </div>
          </div>
          <Rocket size={28} className="absolute -top-4 -right-4 text-primary animate-bounce" />
        </div>
        <h3 className="text-xl font-semibold font-heading-bn text-foreground mb-2">{t('এখানে আপনার বিজ্ঞাপন দেখাবে', 'Your ads will appear here')}</h3>
        <p className="text-[15px] font-heading-bn text-muted-foreground mb-6">{t('বাম দিকে তথ্য দিয়ে তৈরি বাটনে চাপুন', 'Fill in the details on the left and hit generate')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { icon: <Zap size={12} />, text: t('৮-১৫ সেকেন্ডে তৈরি', 'Ready in 8-15 seconds') },
            { icon: <BarChart3 size={12} />, text: t('ধুম স্কোরসহ', 'With Dhoom Score') },
            { icon: <RotateCcw size={12} />, text: t('রিমিক্স করুন', 'Remix it') },
          ].map(chip => (
            <span key={chip.text} className="px-3 py-1.5 rounded-full bg-secondary text-xs font-heading-bn text-muted-foreground flex items-center gap-1.5">
              {chip.icon} {chip.text}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // LOADING STATE
  if (generating) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8">
        <div className="flex gap-2 mb-6">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-primary"
              animate={{ scale: [0.6, 1, 0.6] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <p className="text-sm font-medium font-heading-bn text-foreground animate-pulse mb-4">
          {loadingMsgs[loadingMsgIdx]}
        </p>
        <div className="w-64 h-1.5 rounded-full bg-border overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <AnimatePresence>
          {showTip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-card rounded-xl p-4 max-w-sm border border-border"
            >
              <p className="text-xs font-semibold font-heading-bn text-foreground mb-1 flex items-center gap-1">
                <Lightbulb size={14} className="text-primary" /> {t('জানেন কি?', 'Did you know?')}
              </p>
              <p className="text-[13px] font-heading-bn text-muted-foreground">
                {lang === 'bn' ? LOADING_TIPS[tipIdx] : LOADING_TIPS_EN[tipIdx]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // RESULTS STATE — filter out failed/null image results
  const validResults = results.filter(ad => {
    if (mode === 'image' && (!ad.image_url || ad.image_url === '')) return false;
    return true;
  });
  const failedCount = results.length - validResults.length;
  const requestedCount = results.length;
  const successCount = validResults.length;

  const countLabel = failedCount > 0
    ? t(
        `${toBengali(successCount)}/${toBengali(requestedCount)}টি বিজ্ঞাপন তৈরি হয়েছে`,
        `${successCount} of ${requestedCount} ads generated`
      )
    : t(
        `${toBengali(successCount)}টি বিজ্ঞাপন তৈরি হয়েছে`,
        `${successCount} ads generated`
      );

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold font-heading-bn text-foreground">
          {countLabel}
        </h3>
        <div className="flex gap-2">
          <button onClick={copyAll} className="px-3 py-1.5 rounded-lg border border-input text-xs font-heading-bn text-foreground hover:bg-secondary transition-colors">
            {t('সব কপি করুন', 'Copy All')}
          </button>
          <button onClick={onRegenerate} className="px-3 py-1.5 rounded-lg border border-input text-xs font-heading-bn text-foreground hover:bg-secondary transition-colors flex items-center gap-1">
            <RefreshCw size={12} /> {t('পুনরায় তৈরি করুন', 'Regenerate')}
          </button>
        </div>
      </div>

      {/* Partial results warning banner */}
      {failedCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 mb-4"
          style={{ background: 'rgba(255,184,0,0.08)', borderColor: 'rgba(255,184,0,0.3)' }}
        >
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <p className="text-[13px] font-heading-bn text-foreground">
            {t(
              `${toBengali(successCount)}/${toBengali(requestedCount)}টি ভেরিয়েশন তৈরি হয়েছে। ${toBengali(failedCount)}টি ব্যর্থ হয়েছে — নিচে পুনরায় চেষ্টা করুন।`,
              `${successCount} of ${requestedCount} variations generated. ${failedCount} failed — retry below.`
            )}
          </p>
        </div>
      )}

      {/* CONNECTION 5: Project prompt */}
      {showProjectPrompt && (
        <ProjectPromptInline
          t={t}
          workspaceId={activeWorkspace?.id}
          onAssign={onAssignAllToProject}
          onDismiss={onDismissProjectPrompt}
        />
      )}

      {/* Platform tags */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {[...new Set(validResults.map(r => r.platform))].map(p => (
          <span key={p} className="px-2.5 py-0.5 rounded-full bg-secondary text-[12px] font-heading-bn text-muted-foreground capitalize">{p}</span>
        ))}
        {validResults[0]?.framework && (
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-[12px] font-heading-bn text-primary">{validResults[0].framework}</span>
        )}
      </div>

      {/* Ad Cards */}
      <div className="space-y-4">
        {validResults.map((ad, i) => (
            <AdCopyCard
              key={ad.id || i}
              ad={ad}
              rank={i + 1}
              copiedId={copiedId}
              onCopy={() => copySingle(ad)}
              onWinner={() => toggleWinner(ad)}
              onRemix={() => onRemix(ad)}
              onSwitchToImage={() => onSwitchToImage(ad)}
              onDownload={() => ad.image_url && downloadImage(ad.image_url, `ad-${ad.id || i + 1}`)}
              onSchedule={onSchedule ? () => onSchedule(ad) : undefined}
              delay={i * 0.1}
              projectId={projectId}
            />
        ))}

        {/* Failed slot retry cards */}
        {failedCount > 0 && Array.from({ length: failedCount }).map((_, i) => (
          <div
            key={`failed-${i}`}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed border-border bg-secondary/30 py-10"
          >
            <AlertTriangle size={24} className="text-muted-foreground" />
            <p className="text-sm font-heading-bn text-muted-foreground">
              {t('এই ভেরিয়েশন তৈরি হয়নি', 'This variation failed')}
            </p>
            <button
              onClick={onRegenerate}
              className="px-4 py-2 rounded-lg border border-input text-xs font-bold font-heading-bn text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={12} /> {t('পুনরায় চেষ্টা করুন', 'Retry')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Single ad card component
const AdCopyCard = ({ ad, rank, copiedId, onCopy, onWinner, onRemix, onSwitchToImage, onDownload, onSchedule, delay, projectId }: {
  ad: AdResult; rank: number; copiedId: string | null;
  onCopy: () => void; onWinner: () => void; onRemix: () => void;
  onSwitchToImage: () => void; onDownload: () => void; onSchedule?: () => void; delay: number;
  projectId?: string | null;
}) => {
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [assignedProject, setAssignedProject] = useState<ProjectOption | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const isWinner = ad.is_winner;
  const isCopied = copiedId === ad.id;

  const fetchProjects = async () => {
    if (!activeWorkspace || projects.length > 0) return;
    setLoadingProjects(true);
    const { data } = await supabase
      .from('projects')
      .select('id, name, emoji, color')
      .eq('workspace_id', activeWorkspace.id)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });
    if (data) setProjects(data);
    setLoadingProjects(false);
  };

  const assignToProject = async (project: ProjectOption) => {
    if (!ad.id) return;
    const table = ad.image_url ? 'ad_images' : 'ad_creatives';
    // ad_images doesn't have project_id, only ad_creatives does
    if (ad.image_url) {
      toast.error(t('ইমেজ এডগুলো এখনো প্রজেক্টে যোগ করা যায় না', 'Image ads cannot be added to projects yet'));
      return;
    }
    const { error } = await supabase.from('ad_creatives').update({ project_id: project.id }).eq('id', ad.id);
    if (!error) {
      setAssignedProject(project);
      setProjectDropdownOpen(false);
      toast.success(t(`"${project.name}" প্রজেক্টে যোগ হয়েছে`, `Added to "${project.name}"`));
    } else {
      toast.error(t('যোগ করতে সমস্যা হয়েছে', 'Failed to add'));
    }
  };

  const rankColors = [
    'bg-gradient-to-br from-[#FFB800] to-[#FF8C00]',
    'bg-gradient-to-br from-[#C0C0C0] to-[#A0A0A0]',
    'bg-gradient-to-br from-[#CD7F32] to-[#B8680A]',
  ];

  const scoreLabel = (s: number | null | undefined) => {
    if (s === null || s === undefined || isNaN(s)) return { icon: <AlertTriangle size={14} />, text: t('স্কোর পাওয়া যায়নি', 'Score unavailable'), bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' };
    if (s >= 80) return { icon: <Flame size={14} />, text: t(`ধুম! ${s}`, `Dhoom! ${s}`), bg: '#FFF3E8', color: '#FF5100' };
    if (s >= 60) return { icon: <TrendingUp size={14} />, text: t(`লঞ্চ ${s}`, `Launch ${s}`), bg: '#E8FFF4', color: '#00B96B' };
    if (s >= 40) return { icon: <TrendingUp size={14} />, text: t(`টেস্ট করুন ${s}`, `Test It ${s}`), bg: '#FFFBEB', color: '#FFB800' };
    return { icon: <Zap size={14} />, text: t(`স্কিপ ${s}`, `Skip ${s}`), bg: 'hsl(var(--muted))', color: '#9E9E9E' };
  };

  const dhoomLabel = scoreLabel(ad.dhoom_score);

  const scoreBars = [
    { label: t('হুক শক্তি', 'Hook Strength'), value: ad.scores?.hook_strength ?? null, weight: '25%' },
    { label: t('আবেগ', 'Emotional Resonance'), value: ad.scores?.emotional_resonance ?? null, weight: '20%' },
    { label: t('আপত্তি হ্যান্ডলিং', 'Objection Handling'), value: ad.scores?.objection_handling ?? null, weight: '20%' },
    { label: t('অফার স্পষ্টতা', 'Offer Clarity'), value: ad.scores?.offer_clarity ?? null, weight: '15%' },
    { label: t('সচেতনতা ফিট', 'Awareness Fit'), value: ad.scores?.awareness_fit ?? null, weight: '10%' },
    { label: t('ভাষা', 'Language Execution'), value: ad.scores?.language_execution ?? null, weight: '10%' },
  ];

  const barColor = (v: number | null) => v === null ? '#9E9E9E' : v > 80 ? '#00B96B' : v >= 60 ? '#FFB800' : '#EF4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative"
    >
      {/* Winner banner */}
      {isWinner && (
        <div className="bg-gradient-to-r from-[#FFB800] to-[#FF8C00] text-primary-foreground text-[11px] font-semibold font-heading-bn h-7 flex items-center justify-center gap-1 rounded-t-[20px]">
          <Star size={12} className="fill-current" /> {t('বিজয়ী বিজ্ঞাপন — এটি সবচেয়ে ভালো কাজ করছে', 'Winner Ad — Best performing')}
        </div>
      )}
      <div
        className={`bg-card rounded-[20px] border p-6 transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5 ${
          isWinner ? 'border-[#FFB800] rounded-t-none' : 'border-border'
        }`}
      >
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {rank <= 3 && (
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-mono font-bold text-primary-foreground ${rankColors[rank - 1] || ''}`}>
                #{rank}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-secondary text-muted-foreground capitalize font-heading-bn">{ad.platform}</span>
          </div>
          {rank === 1 ? (
            <FeatureTooltip tooltipKey="dhoom_score" position="left">
              <div className="text-right">
                <span
                  className="px-3 py-1 rounded-full text-[13px] font-mono font-bold inline-flex items-center gap-1"
                  style={{ backgroundColor: dhoomLabel.bg, color: dhoomLabel.color }}
                >
                  {dhoomLabel.icon} {dhoomLabel.text}
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t('ধুম স্কোর', 'Dhoom Score')}</p>
              </div>
            </FeatureTooltip>
          ) : (
            <div className="text-right">
              <span
                className="px-3 py-1 rounded-full text-[13px] font-mono font-bold inline-flex items-center gap-1"
                style={{ backgroundColor: dhoomLabel.bg, color: dhoomLabel.color }}
              >
                {dhoomLabel.icon} {dhoomLabel.text}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t('ধুম স্কোর', 'Dhoom Score')}</p>
            </div>
          )}
        </div>

        {/* Generated Image */}
        {ad.image_url && (
          <div className="mb-4 rounded-xl overflow-hidden border border-border">
            <img
              src={ad.image_url}
              alt={ad.headline}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Headline */}
        <div className="bg-primary/[0.04] border-l-[3px] border-primary rounded-r-lg px-3.5 py-2.5 mb-3">
          <h4 className="text-[17px] font-bold font-heading-bn text-foreground leading-relaxed">{ad.headline}</h4>
        </div>

        {/* Body - for image ads, hide prompt entirely */}
        {ad.image_url ? (
          null
        ) : (
          <p className="text-[15px] font-heading-bn text-muted-foreground leading-[1.7] mb-2 whitespace-pre-line px-1">{ad.body}</p>
        )}

        {/* CTA */}
        {ad.cta && (
          <p className="text-[15px] font-bold font-heading-bn text-primary mt-2 px-1">→ {ad.cta}</p>
        )}

        {/* Score breakdown toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[13px] text-muted-foreground font-heading-bn mt-3 flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {t('স্কোর বিস্তারিত দেখুন', 'View score details')} <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 mt-3 pt-3 border-t border-border">
                {scoreBars.map(bar => (
                  <div key={bar.label} className="flex items-center gap-3">
                    <span className="text-[12px] font-heading-bn text-muted-foreground w-24 shrink-0">{bar.label}</span>
                    <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${bar.value}%` }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: barColor(bar.value) }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">{bar.value}%</span>
                  </div>
                ))}
                {ad.score_reason && (
                  <p className="text-[13px] italic text-muted-foreground font-heading-bn mt-2">{ad.score_reason}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-border">
          {ad.image_url ? (
            <>
              <button
                onClick={onDownload}
                className="px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/[0.08] text-primary text-xs font-heading-bn hover:bg-primary/15 transition-all active:scale-95 flex items-center gap-1"
              >
                <Download size={12} /> {t('ডাউনলোড', 'Download')}
              </button>
              <button onClick={onRemix} className="px-3 py-1.5 rounded-lg border border-input text-xs font-heading-bn hover:bg-secondary transition-all active:scale-95 flex items-center gap-1">
                <RefreshCw size={12} /> {t('রিমিক্স', 'Remix')}
              </button>
              <button
                onClick={onWinner}
                className="px-3 py-1.5 rounded-lg border border-input text-xs font-heading-bn hover:bg-secondary transition-all active:scale-95 flex items-center gap-1"
              >
                <Star size={12} className={isWinner ? 'fill-[#FFB800] text-[#FFB800]' : ''} />
                {isWinner ? t('বিজয়ী', 'Winner') : t('বিজয়ী চিহ্নিত করুন', 'Mark Winner')}
              </button>
            </>
          ) : null}
          {/* Schedule button (Connection 2 & 4) */}
          {onSchedule && ad.id && (
            ad.image_url ? (
              <button
                onClick={onSchedule}
                className="w-full mt-2 py-2 rounded-lg border-[1.5px] border-border text-xs font-heading-bn text-muted-foreground hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-1.5"
              >
                <Calendar size={12} /> {t('ক্যালেন্ডারে শিডিউল করুন', 'Schedule to Calendar')}
              </button>
            ) : null
          )}
          {!ad.image_url && (
            <>
              <button
                onClick={onCopy}
                className="px-3 py-1.5 rounded-lg border border-input text-xs font-heading-bn hover:bg-secondary transition-all active:scale-95 flex items-center gap-1"
              >
                {isCopied ? <><Check size={12} className="text-brand-green" /> {t('কপি হয়েছে', 'Copied')}</> : <><Copy size={12} /> {t('কপি করুন', 'Copy')}</>}
              </button>
              {rank === 1 ? (
                <FeatureTooltip tooltipKey="remix_button" position="bottom">
                  <button onClick={onRemix} className="px-3 py-1.5 rounded-lg border border-input text-xs font-heading-bn hover:bg-secondary transition-all active:scale-95 flex items-center gap-1">
                    <RefreshCw size={12} /> {t('রিমিক্স', 'Remix')}
                  </button>
                </FeatureTooltip>
              ) : (
                <button onClick={onRemix} className="px-3 py-1.5 rounded-lg border border-input text-xs font-heading-bn hover:bg-secondary transition-all active:scale-95 flex items-center gap-1">
                  <RefreshCw size={12} /> {t('রিমিক্স', 'Remix')}
                </button>
              )}
              {rank === 1 ? (
                <FeatureTooltip tooltipKey="winner_star" position="bottom">
                  <button
                    onClick={onWinner}
                    className="px-3 py-1.5 rounded-lg border border-input text-xs font-heading-bn hover:bg-secondary transition-all active:scale-95 flex items-center gap-1"
                  >
                    <Star size={12} className={isWinner ? 'fill-[#FFB800] text-[#FFB800]' : ''} />
                    {isWinner ? t('বিজয়ী', 'Winner') : t('বিজয়ী চিহ্নিত করুন', 'Mark Winner')}
                  </button>
                </FeatureTooltip>
              ) : (
                <button
                  onClick={onWinner}
                  className="px-3 py-1.5 rounded-lg border border-input text-xs font-heading-bn hover:bg-secondary transition-all active:scale-95 flex items-center gap-1"
                >
                  <Star size={12} className={isWinner ? 'fill-[#FFB800] text-[#FFB800]' : ''} />
                  {isWinner ? t('বিজয়ী', 'Winner') : t('বিজয়ী চিহ্নিত করুন', 'Mark Winner')}
                </button>
              )}
              <button
                onClick={onSwitchToImage}
                className="px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/[0.08] text-primary text-xs font-heading-bn hover:bg-primary/15 transition-all active:scale-95 flex items-center gap-1"
              >
              <ImageIcon size={12} /> {t('ছবি বানান', 'Make Image')}
              </button>
              {/* Schedule copy directly (Connection 4) */}
              {onSchedule && ad.id && (
                <button
                  onClick={onSchedule}
                  className="px-3 py-1.5 rounded-lg border border-input text-xs font-heading-bn hover:bg-secondary transition-all active:scale-95 flex items-center gap-1"
                >
                  <Calendar size={12} /> {t('শিডিউল', 'Schedule')}
                </button>
              )}
            </>
          )}
        </div>

        {/* Add to Project - only when no project context */}
        {!projectId && !assignedProject && ad.id && !ad.image_url && (
          <div className="relative mt-3">
            <button
              onClick={() => { setProjectDropdownOpen(!projectDropdownOpen); if (!projectDropdownOpen) fetchProjects(); }}
              className="text-[13px] font-heading-bn text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <FolderPlus size={13} /> {t('+ প্রজেক্টে যোগ করুন', '+ Add to Project')}
              <ChevronDown size={12} className={`transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {projectDropdownOpen && (
              <div className="absolute left-0 bottom-full mb-1 z-20 w-64 bg-popover border border-border rounded-xl shadow-lg p-1.5 max-h-48 overflow-y-auto">
                {loadingProjects ? (
                  <p className="text-xs text-muted-foreground p-2 text-center">{t('লোড হচ্ছে...', 'Loading...')}</p>
                ) : projects.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2 text-center">{t('কোনো প্রজেক্ট নেই', 'No projects yet')}</p>
                ) : projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => assignToProject(p)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-secondary transition-colors"
                  >
                    <FolderOpen size={14} style={{ color: p.color }} />
                    <span className="text-sm font-heading-bn text-foreground truncate">{p.emoji} {p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assigned project badge */}
        {assignedProject && (
          <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-xs font-heading-bn">
            <CheckCircle2 size={13} className="text-brand-green" />
            <FolderOpen size={13} style={{ color: assignedProject.color }} />
            <span className="text-foreground">{assignedProject.emoji} {assignedProject.name}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// CONNECTION 5: Inline project assignment prompt
const ProjectPromptInline = ({ t, workspaceId, onAssign, onDismiss }: {
  t: any;
  workspaceId?: string;
  onAssign?: (projectId: string, projectName: string) => void;
  onDismiss?: () => void;
}) => {
  const [projects, setProjects] = useState<{ id: string; name: string; emoji: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!workspaceId || !open) return;
    supabase.from('projects').select('id, name, emoji')
      .eq('workspace_id', workspaceId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setProjects(data); });
  }, [workspaceId, open]);

  return (
    <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/[0.04] border border-primary/10">
      <Lightbulb size={14} className="text-primary shrink-0" />
      <span className="text-xs font-heading-bn text-foreground flex-1">
        {t('এই বিজ্ঞাপনগুলো কোনো প্রজেক্টে সংরক্ষণ করবেন?', 'Save these ads to a project?')}
      </span>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-heading-bn font-semibold hover:bg-primary/20 transition-colors"
        >
          {t('নির্বাচন করুন', 'Select')}
        </button>
      ) : (
        <select
          onChange={e => {
            const p = projects.find(pr => pr.id === e.target.value);
            if (p && onAssign) onAssign(p.id, p.name);
          }}
          className="text-xs border border-input rounded-lg px-2 py-1 bg-card font-heading-bn"
          defaultValue=""
        >
          <option value="" disabled>{t('প্রজেক্ট বাছুন', 'Choose project')}</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
          ))}
        </select>
      )}
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground text-xs ml-1">
        <X size={14} />
      </button>
    </div>
  );
};

export default ResultsPanel;
