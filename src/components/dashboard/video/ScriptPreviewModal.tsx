import { motion } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { VideoScript, VideoFormData } from './types';

interface ScriptPreviewModalProps {
  script: VideoScript;
  form: VideoFormData;
  onClose: () => void;
  onConfirm: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
  generating: boolean;
}

const ScriptPreviewModal = ({ script, form, onClose, onConfirm, onRegenerate, regenerating, generating }: ScriptPreviewModalProps) => {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-[20px] max-w-[560px] w-full max-h-[80vh] overflow-y-auto shadow-xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold font-heading-bn text-foreground">📝 {t('AI লেখা স্ক্রিপ্ট', 'AI Script')}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center"><X size={18} /></button>
          </div>
          <p className="text-sm text-muted-foreground font-heading-bn mb-6">{t('ভিডিওতে এই টেক্সট ব্যবহার হবে', 'This text will be used in the video')}</p>

          {/* Timeline */}
          <div className="space-y-3 mb-6">
            {script.slides.map((slide, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-mono font-bold shrink-0 mt-0.5">
                  {slide.time_start}–{slide.time_end}s
                </span>
                {form.imagePreviews[slide.image_index] && (
                  <img
                    src={form.imagePreviews[slide.image_index]}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-heading-bn text-foreground">{slide.headline_text}</p>
                  {slide.sub_text && <p className="text-xs text-muted-foreground">{slide.sub_text}</p>}
                </div>
              </div>
            ))}
          </div>

          {script.suggested_hashtags.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-muted-foreground mb-1">{t('সাজেস্টেড হ্যাশট্যাগ:', 'Suggested hashtags:')}</p>
              <p className="text-sm text-primary">{script.suggested_hashtags.join(' ')}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onRegenerate}
              disabled={regenerating}
              className="px-5 py-3 rounded-xl border border-border text-sm font-heading-bn font-semibold hover:bg-secondary transition-all disabled:opacity-50 flex items-center gap-1"
            >
              <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} /> {t('আবার লিখুন', 'Rewrite')}
            </button>
            <button
              onClick={onConfirm}
              disabled={generating}
              className="flex-1 px-5 py-3 rounded-xl bg-gradient-cta text-primary-foreground text-sm font-heading-bn font-bold shadow-orange-glow hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {generating ? t('তৈরি হচ্ছে...', 'Creating...') : t('ভিডিও তৈরি করুন', 'Create Video')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ScriptPreviewModal;
