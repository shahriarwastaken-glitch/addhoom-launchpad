import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, RefreshCw, Star, ChevronDown, Image as ImageIcon, Check, Rocket, Zap, BarChart3, RotateCcw, Lightbulb, Flame, TrendingUp, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AdResult, GeneratorMode } from './types';
import { LOADING_TIPS, LOADING_TIPS_EN } from './types';

const toBengali = (n: number) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

interface ResultsPanelProps {
  mode: GeneratorMode;
  results: AdResult[];
  setResults: React.Dispatch<React.SetStateAction<AdResult[]>>;
  generating: boolean;
  onRegenerate: () => void;
  onSwitchToImage: (ad: AdResult) => void;
  onRemix: (ad: AdResult) => void;
}

const ResultsPanel = ({ mode, results, setResults, generating, onRegenerate, onSwitchToImage, onRemix }: ResultsPanelProps) => {
  const { t, lang } = useLanguage();
  const [progress, setProgress] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [tipIdx] = useState(() => Math.floor(Math.random() * LOADING_TIPS.length));
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    navigator.clipboard.writeText(`${ad.headline}\n\n${ad.body}\n\n${ad.cta}`);
    setCopiedId(ad.id || '');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleWinner = async (ad: AdResult) => {
    if (!ad.id) return;
    const newVal = !ad.is_winner;
    const { error } = await supabase.from('ad_creatives').update({ is_winner: newVal } as any).eq('id', ad.id);
    if (!error) {
      setResults(prev => prev.map(a => a.id === ad.id ? { ...a, is_winner: newVal } : a));
      toast.success(newVal ? t('বিজয়ী চিহ্নিত করা হয়েছে', 'Marked as winner') : t('বিজয়ী সরানো হয়েছে', 'Removed winner'));
    }
  };

  const displayNum = (n: number) => lang === 'bn' ? toBengali(n) : n;

  // EMPTY STATE
  if (!generating && results.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
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

  // RESULTS STATE
  return (
    <div className="h-full overflow-y-auto p-6 lg:p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold font-heading-bn text-foreground">
          {t(`${toBengali(results.length)}টি বিজ্ঞাপন তৈরি হয়েছে`, `${results.length} ads generated`)}
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

      {/* Platform tags */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {[...new Set(results.map(r => r.platform))].map(p => (
          <span key={p} className="px-2.5 py-0.5 rounded-full bg-secondary text-[12px] font-heading-bn text-muted-foreground capitalize">{p}</span>
        ))}
        {results[0]?.framework && (
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-[12px] font-heading-bn text-primary">{results[0].framework}</span>
        )}
      </div>

      {/* Ad Cards */}
      <div className="space-y-4">
        {results.map((ad, i) => (
          <AdCopyCard
            key={ad.id || i}
            ad={ad}
            rank={i + 1}
            copiedId={copiedId}
            onCopy={() => copySingle(ad)}
            onWinner={() => toggleWinner(ad)}
            onRemix={() => onRemix(ad)}
            onSwitchToImage={() => onSwitchToImage(ad)}
            delay={i * 0.1}
          />
        ))}
      </div>
    </div>
  );
};

// Single ad card component
const AdCopyCard = ({ ad, rank, copiedId, onCopy, onWinner, onRemix, onSwitchToImage, delay }: {
  ad: AdResult; rank: number; copiedId: string | null;
  onCopy: () => void; onWinner: () => void; onRemix: () => void;
  onSwitchToImage: () => void; delay: number;
}) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const isWinner = ad.is_winner;
  const isCopied = copiedId === ad.id;

  const rankColors = [
    'bg-gradient-to-br from-[#FFB800] to-[#FF8C00]',
    'bg-gradient-to-br from-[#C0C0C0] to-[#A0A0A0]',
    'bg-gradient-to-br from-[#CD7F32] to-[#B8680A]',
  ];

  const scoreLabel = (s: number) => {
    if (s >= 70) return { icon: <Flame size={14} />, text: t(`ধুম! ${s}`, `Dhoom! ${s}`), bg: '#E8FFF4', color: '#00B96B' };
    if (s >= 50) return { icon: <TrendingUp size={14} />, text: t(`ভালো ${s}`, `Good ${s}`), bg: '#FFFBEB', color: '#D97706' };
    return { icon: <Zap size={14} />, text: t(`আরো কাজ দরকার ${s}`, `Needs work ${s}`), bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' };
  };

  const dhoomLabel = scoreLabel(ad.dhoom_score);

  const scoreBars = [
    { label: t('হুক শক্তি', 'Hook Strength'), value: Math.min(100, ad.dhoom_score + Math.floor(Math.random() * 15 - 5)) },
    { label: t('বাংলা ভাষা', 'Language'), value: Math.min(100, ad.dhoom_score + Math.floor(Math.random() * 15)) },
    { label: t('কৌশল প্রয়োগ', 'Framework'), value: Math.min(100, ad.dhoom_score + Math.floor(Math.random() * 10 - 8)) },
    { label: t('CTA শক্তি', 'CTA Strength'), value: Math.min(100, ad.dhoom_score + Math.floor(Math.random() * 10 - 3)) },
    { label: t('মোবাইল পাঠ', 'Mobile Read'), value: Math.min(100, ad.dhoom_score + Math.floor(Math.random() * 12)) },
    { label: t('বাজার ফিট', 'Market Fit'), value: Math.min(100, ad.dhoom_score + Math.floor(Math.random() * 10 - 2)) },
  ];

  const barColor = (v: number) => v > 80 ? '#00B96B' : v >= 60 ? '#FFB800' : '#EF4444';

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
          <div className="text-right">
            <span
              className="px-3 py-1 rounded-full text-[13px] font-mono font-bold inline-flex items-center gap-1"
              style={{ backgroundColor: dhoomLabel.bg, color: dhoomLabel.color }}
            >
              {dhoomLabel.icon} {dhoomLabel.text}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t('ধুম স্কোর', 'Dhoom Score')}</p>
          </div>
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

        {/* Body (prompt) - show truncated for image ads */}
        {ad.image_url ? (
          ad.body ? (
            <div className="mb-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const el = (e.currentTarget as HTMLElement).nextElementSibling;
                  if (el) el.classList.toggle('hidden');
                }}
                className="text-[13px] text-muted-foreground font-heading-bn cursor-pointer hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ChevronDown size={12} /> {t('প্রম্পট দেখুন', 'View prompt')}
              </button>
              <p className="hidden text-[13px] font-heading-bn text-muted-foreground leading-[1.6] mt-2 whitespace-pre-line px-1">{ad.body}</p>
            </div>
          ) : null
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
              <a
                href={ad.image_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/[0.08] text-primary text-xs font-heading-bn hover:bg-primary/15 transition-all active:scale-95 flex items-center gap-1"
              >
                <Download size={12} /> {t('ডাউনলোড', 'Download')}
              </a>
              <button onClick={onCopy} className="px-3 py-1.5 rounded-lg border border-input text-xs font-heading-bn hover:bg-secondary transition-all active:scale-95 flex items-center gap-1">
                {isCopied ? <><Check size={12} className="text-brand-green" /> {t('কপি হয়েছে', 'Copied')}</> : <><Copy size={12} /> {t('প্রম্পট কপি', 'Copy Prompt')}</>}
              </button>
              <button
                onClick={onWinner}
                className="px-3 py-1.5 rounded-lg border border-input text-xs font-heading-bn hover:bg-secondary transition-all active:scale-95 flex items-center gap-1"
              >
                <Star size={12} className={isWinner ? 'fill-[#FFB800] text-[#FFB800]' : ''} />
                {isWinner ? t('বিজয়ী', 'Winner') : t('বিজয়ী চিহ্নিত করুন', 'Mark Winner')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onCopy}
                className="px-3 py-1.5 rounded-lg border border-input text-xs font-heading-bn hover:bg-secondary transition-all active:scale-95 flex items-center gap-1"
              >
                {isCopied ? <><Check size={12} className="text-brand-green" /> {t('কপি হয়েছে', 'Copied')}</> : <><Copy size={12} /> {t('কপি করুন', 'Copy')}</>}
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
              <button
                onClick={onSwitchToImage}
                className="px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/[0.08] text-primary text-xs font-heading-bn hover:bg-primary/15 transition-all active:scale-95 flex items-center gap-1"
              >
                <ImageIcon size={12} /> {t('এই কপি দিয়ে ছবি বানান', 'Make image from this')}
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ResultsPanel;
