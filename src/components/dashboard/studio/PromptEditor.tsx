import { useState, useCallback } from 'react';
import { Sparkles, Loader2, ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface PromptEditorProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  defaultPrompt: string;
  onBack: () => void;
  onGenerate: () => void;
  generating: boolean;
  generateLabel: string;
  generateIcon: React.ReactNode;
  tabType: 'ad_image' | 'product_photo' | 'tryon';
  costNote?: string;
  helperNote?: string;
}

const PromptEditor = ({
  prompt,
  onPromptChange,
  defaultPrompt,
  onBack,
  onGenerate,
  generating,
  generateLabel,
  generateIcon,
  tabType,
  costNote,
  helperNote,
}: PromptEditorProps) => {
  const { t } = useLanguage();
  const [enhancing, setEnhancing] = useState(false);
  const [wasEdited, setWasEdited] = useState(false);

  const handleChange = useCallback((value: string) => {
    onPromptChange(value);
    setWasEdited(true);
  }, [onPromptChange]);

  const handleEnhance = async () => {
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: { prompt, tab_type: tabType },
      });
      if (error) throw error;
      if (data?.enhanced_prompt) {
        onPromptChange(data.enhanced_prompt);
        setWasEdited(true);
        toast.success(t('প্রম্পট উন্নত হয়েছে ✨', 'Prompt enhanced ✨'));
      }
    } catch (err: any) {
      toast.error(t('উন্নতকরণ ব্যর্থ — আপনার প্রম্পট অপরিবর্তিত আছে', 'Enhancement failed — your prompt is unchanged'));
    } finally {
      setEnhancing(false);
    }
  };

  const handleReset = () => {
    if (wasEdited) {
      if (!confirm(t('এটি আপনার সম্পাদনা প্রতিস্থাপন করবে। আপনি কি নিশ্চিত?', 'This will replace your edits. Are you sure?'))) {
        return;
      }
    }
    onPromptChange(defaultPrompt);
    setWasEdited(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('আপনার প্রম্পট', 'Your Prompt')}</h3>
        <button
          onClick={handleEnhance}
          disabled={enhancing || !prompt.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: enhancing ? 'hsl(var(--muted))' : 'rgba(108, 63, 232, 0.1)',
            borderColor: 'rgba(108, 63, 232, 0.3)',
            color: '#6C3FE8',
          }}
        >
          {enhancing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {enhancing ? t('উন্নত হচ্ছে...', 'Enhancing...') : t('উন্নত করুন', 'Enhance')}
        </button>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full rounded-xl border-[1.5px] border-border bg-[hsl(var(--muted)/0.3)] px-4 py-3 text-sm font-mono text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] resize-y"
          style={{ minHeight: '200px', maxHeight: '400px' }}
        />
        <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground">
          {prompt.length} {t('অক্ষর', 'characters')}
        </span>
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        {helperNote || t(
          'স্বাধীনভাবে সম্পাদনা করুন — এটিই AI-তে পাঠানো হবে। ভালো প্রম্পট = ভালো ইমেজ।',
          'Edit freely — this is exactly what gets sent to the AI. Better prompt = better image.'
        )}
      </p>

      {/* Reset link */}
      <button
        onClick={handleReset}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <RotateCcw className="h-3 w-3" />
        {t('ডিফল্টে রিসেট করুন', 'Reset to default')}
      </button>

      {/* Generate Button */}
      <div className="space-y-1.5">
        <Button
          onClick={onGenerate}
          disabled={generating || !prompt.trim()}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : generateIcon}
          {generateLabel}
        </Button>
        {costNote && (
          <p className="text-[11px] text-center" style={{ color: '#9E9E9E' }}>{costNote}</p>
        )}
      </div>

      {/* Back link */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
      >
        <ArrowLeft className="h-3 w-3" />
        {t('অপশনে ফিরুন', 'Back to Options')}
      </button>
    </div>
  );
};

export default PromptEditor;
