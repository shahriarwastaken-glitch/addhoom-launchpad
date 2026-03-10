import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdResult } from './types';

interface CopyRemixPanelProps {
  ad: AdResult;
  workspaceId: string;
  onClose: () => void;
  onRemixComplete: (ads: AdResult[]) => void;
}

function buildCopyRemixPrompt(config: {
  originalHeadline: string;
  originalBody: string;
  originalCta: string;
  productName: string;
  framework: string;
  tone: string;
  language: string;
  platform: string;
}): string {
  return `You are remixing an existing ad.
Generate 3 new variations that are similar in style and intent but take completely different angles.

ORIGINAL AD:
Headline: ${config.originalHeadline}
Body: ${config.originalBody}
CTA: ${config.originalCta}

KEEP THE SAME:
- Product: ${config.productName}
- Framework: ${config.framework}
- Tone: ${config.tone}
- Language: ${config.language}
- Platform: ${config.platform}

CHANGE:
- Hook angle
- Emotional entry point
- Supporting arguments
- Sentence structure

Each variation must feel like a genuinely different ad — not the same ad with synonyms swapped.

Follow all copy quality rules: no generic hooks, no filler words, specific social proof only, grounded urgency only.

Return ONLY valid JSON array:
[{"headline":"...","body":"...","cta":"...","dhoom_score":0,"copy_score":0,"score_reason":"...","improvement_note":"one sentence on what angle this variation takes"}]`.trim();
}

const CopyRemixPanel = ({ ad, workspaceId, onClose, onRemixComplete }: CopyRemixPanelProps) => {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState(() =>
    buildCopyRemixPrompt({
      originalHeadline: ad.headline,
      originalBody: ad.body,
      originalCta: ad.cta,
      productName: ad.headline,
      framework: ad.framework || 'FOMO',
      tone: 'friendly',
      language: ad.language || 'bn',
      platform: ad.platform || 'facebook',
    })
  );
  const [generating, setGenerating] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [results, setResults] = useState<AdResult[]>([]);

  const defaultPrompt = buildCopyRemixPrompt({
    originalHeadline: ad.headline,
    originalBody: ad.body,
    originalCta: ad.cta,
    productName: ad.headline,
    framework: ad.framework || 'FOMO',
    tone: 'friendly',
    language: ad.language || 'bn',
    platform: ad.platform || 'facebook',
  });

  const handleEnhance = async () => {
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: { prompt, type: 'copy_remix' },
      });
      if (!error && data?.enhanced_prompt) {
        setPrompt(data.enhanced_prompt);
        toast.success(t('প্রম্পট উন্নত হয়েছে', 'Prompt enhanced'));
      }
    } catch {
      toast.error(t('উন্নত করতে সমস্যা', 'Enhancement failed'));
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('remix-ad', {
        body: {
          workspace_id: workspaceId,
          ad_id: ad.id,
          num_variations: 3,
          custom_prompt: prompt,
        },
      });
      if (error) throw error;
      if (data?.success && data.ads) {
        setResults(data.ads);
        onRemixComplete(data.ads);
        toast.success(t(`${data.count}টি রিমিক্স তৈরি হয়েছে`, `${data.count} remixes created`));
      } else {
        toast.error(data?.message || t('রিমিক্স ব্যর্থ', 'Remix failed'));
      }
    } catch {
      toast.error(t('রিমিক্স ব্যর্থ হয়েছে', 'Remix failed'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
      className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-card border-l border-border z-50 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div>
          <h3 className="text-base font-bold font-heading-bn text-foreground flex items-center gap-2">
            <RefreshCw size={16} className="text-primary" />
            {t('কপি রিমিক্স', 'Remix Ad Copy')}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('একই স্টাইলে নতুন ভার্সন তৈরি করুন', 'Generate similar variations')}
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
          <X size={18} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Original ad preview */}
        <div className="bg-secondary rounded-xl p-3 border border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            {t('মূল বিজ্ঞাপন', 'Original Ad')}
          </p>
          <p className="text-sm font-heading-bn text-foreground font-semibold line-clamp-2">{ad.headline}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ad.body}</p>
          {ad.cta && <p className="text-xs text-primary font-semibold mt-1">→ {ad.cta}</p>}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-card text-muted-foreground">Score: {ad.dhoom_score}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-card text-muted-foreground capitalize">{ad.platform}</span>
            {ad.framework && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{ad.framework}</span>}
          </div>
        </div>

        {/* Prompt section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-foreground">
              {t('রিমিক্স প্রম্পট', 'Remix Prompt')}
            </label>
            <button
              onClick={handleEnhance}
              disabled={enhancing}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent text-accent-foreground hover:brightness-110 transition-all flex items-center gap-1 disabled:opacity-60"
            >
              <Sparkles size={11} />
              {enhancing ? t('উন্নত হচ্ছে...', 'Enhancing...') : t('✨ এনহ্যান্স', '✨ Enhance')}
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            className="w-full min-h-[180px] rounded-xl border border-input bg-card px-3 py-2.5 text-[13px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
          />
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[10px] text-muted-foreground">
              {t('এটি AI-কে পাঠানো হবে। নিজের মতো এডিট করুন।', 'This is what gets sent to the AI. Edit freely.')}
            </p>
            <button
              onClick={() => setPrompt(defaultPrompt)}
              className="text-[10px] text-primary hover:underline"
            >
              {t('রিসেট ↺', 'Reset ↺')}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky bottom */}
      <div className="shrink-0 px-5 py-4 border-t border-border bg-card">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full h-11 rounded-[14px] bg-primary text-primary-foreground font-bold font-heading-bn text-[15px] hover:brightness-110 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {generating ? (
            <><RefreshCw size={16} className="animate-spin" /> {t('রিমিক্স হচ্ছে...', 'Remixing...')}</>
          ) : (
            t('রিমিক্স তৈরি করুন →', 'Generate Remixes →')
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default CopyRemixPanel;
