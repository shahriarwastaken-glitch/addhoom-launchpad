import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Check, X, ArrowLeft, ArrowRight, Heart, ThumbsDown } from 'lucide-react';

type StyleTemplate = {
  id: string;
  name: string;
  style_tags: string[];
  thumbnail_url: string | null;
  example_ad_url: string | null;
};

type StyleCalibrationProps = {
  onComplete: (preferences: {
    liked_ids: string[];
    disliked_ids: string[];
    liked_tags: string[][];
    disliked_tags: string[][];
  }) => void;
  onSkip: () => void;
};

// Fallback templates if DB is empty
const FALLBACK_TEMPLATES: StyleTemplate[] = [
  { id: 'f1', name: 'Bold & Direct', style_tags: ['bold-text', 'high-contrast', 'minimal'], thumbnail_url: null, example_ad_url: null },
  { id: 'f2', name: 'Clean Minimalist', style_tags: ['minimalist', 'whitespace', 'elegant'], thumbnail_url: null, example_ad_url: null },
  { id: 'f3', name: 'Lifestyle Aspirational', style_tags: ['lifestyle', 'aspirational', 'warm-tones'], thumbnail_url: null, example_ad_url: null },
  { id: 'f4', name: 'Sale Urgency', style_tags: ['urgency', 'bold-text', 'red-accents'], thumbnail_url: null, example_ad_url: null },
  { id: 'f5', name: 'Elegant Premium', style_tags: ['premium', 'dark-bg', 'gold-accents'], thumbnail_url: null, example_ad_url: null },
  { id: 'f6', name: 'Playful & Colorful', style_tags: ['colorful', 'playful', 'rounded'], thumbnail_url: null, example_ad_url: null },
  { id: 'f7', name: 'Text-Heavy Info', style_tags: ['text-heavy', 'informative', 'structured'], thumbnail_url: null, example_ad_url: null },
  { id: 'f8', name: 'Photo-First', style_tags: ['photo-centric', 'minimal-text', 'full-bleed'], thumbnail_url: null, example_ad_url: null },
];

const STYLE_COLORS: Record<string, string> = {
  'bold-text': 'bg-red-500',
  'minimalist': 'bg-gray-400',
  'lifestyle': 'bg-amber-500',
  'urgency': 'bg-orange-600',
  'premium': 'bg-yellow-600',
  'colorful': 'bg-pink-500',
  'text-heavy': 'bg-blue-500',
  'photo-centric': 'bg-emerald-500',
  'high-contrast': 'bg-black',
  'whitespace': 'bg-gray-200',
  'elegant': 'bg-purple-400',
  'dark-bg': 'bg-gray-800',
};

const SwipeCard = ({ template, onSwipe, isTop }: {
  template: StyleTemplate;
  onSwipe: (dir: 'left' | 'right') => void;
  isTop: boolean;
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 80], [0, 1]);
  const dislikeOpacity = useTransform(x, [-80, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 80) onSwipe('right');
    else if (info.offset.x < -80) onSwipe('left');
  };

  if (!isTop) {
    return (
      <motion.div className="absolute inset-0 rounded-[20px] bg-card border border-border shadow-lg flex items-center justify-center scale-[0.95] opacity-60">
        <div className="text-center p-6">
          <p className="text-lg font-bold text-foreground">{template.name}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing z-10"
    >
      <div className="w-full h-full rounded-[20px] bg-card border border-border shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col">
        {/* Card visual area */}
        <div className="flex-1 relative overflow-hidden bg-secondary">
          {template.example_ad_url || template.thumbnail_url ? (
            <img
              src={template.example_ad_url || template.thumbnail_url!}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="grid grid-cols-2 gap-3 p-8">
                {template.style_tags.map((tag, i) => (
                  <div
                    key={i}
                    className={`${STYLE_COLORS[tag] || 'bg-primary/20'} rounded-xl h-16 flex items-center justify-center`}
                  >
                    <span className="text-xs font-medium text-white px-2 text-center">{tag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Like/Dislike overlays */}
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute inset-0 bg-[hsl(var(--brand-green))]/20 flex items-center justify-center"
          >
            <div className="w-20 h-20 rounded-full bg-[hsl(var(--brand-green))] flex items-center justify-center">
              <Check size={36} className="text-white" />
            </div>
          </motion.div>
          <motion.div
            style={{ opacity: dislikeOpacity }}
            className="absolute inset-0 bg-destructive/20 flex items-center justify-center"
          >
            <div className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center">
              <X size={36} className="text-white" />
            </div>
          </motion.div>
        </div>

        {/* Card info */}
        <div className="p-5 bg-card">
          <p className="text-lg font-bold text-foreground">{template.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {template.style_tags.join(' · ')}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const StyleCalibration = ({ onComplete, onSkip }: StyleCalibrationProps) => {
  const { activeWorkspace } = useAuth();
  const [templates, setTemplates] = useState<StyleTemplate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<{ id: string; tags: string[] }[]>([]);
  const [disliked, setDisliked] = useState<{ id: string; tags: string[] }[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const loadTemplates = async () => {
      const { data } = await supabase
        .from('style_templates')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      setTemplates(data && data.length >= 6 ? data : FALLBACK_TEMPLATES);
    };
    loadTemplates();
  }, []);

  const minSwipes = 6;
  const total = templates.length;
  const swiped = currentIndex;
  const canFinish = swiped >= minSwipes;

  const handleSwipe = (dir: 'left' | 'right') => {
    const current = templates[currentIndex];
    if (!current) return;

    if (dir === 'right') {
      setLiked(prev => [...prev, { id: current.id, tags: current.style_tags }]);
    } else {
      setDisliked(prev => [...prev, { id: current.id, tags: current.style_tags }]);
    }

    if (currentIndex + 1 >= total) {
      setShowSummary(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleFinish = () => {
    if (canFinish || showSummary) {
      setShowSummary(true);
    }
  };

  const handleConfirm = () => {
    onComplete({
      liked_ids: liked.map(l => l.id),
      disliked_ids: disliked.map(d => d.id),
      liked_tags: liked.map(l => l.tags),
      disliked_tags: disliked.map(d => d.tags),
    });
  };

  const likedTags = [...new Set(liked.flatMap(l => l.tags))];
  const dislikedTags = [...new Set(disliked.flatMap(d => d.tags))];

  if (showSummary) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 mb-4">
            <Heart size={16} />
            <span className="font-semibold text-sm">Style Profile Complete</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Your Style Preferences</h2>
        </div>

        <div className="bg-card rounded-2xl p-6 space-y-4">
          {likedTags.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Check size={14} className="text-[hsl(var(--brand-green))]" /> Preferred Styles
              </p>
              <div className="flex flex-wrap gap-2">
                {likedTags.map(tag => (
                  <span key={tag} className="text-xs bg-[hsl(var(--brand-green))]/10 text-[hsl(var(--brand-green))] rounded-full px-3 py-1.5 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {dislikedTags.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <X size={14} className="text-destructive" /> Avoid These
              </p>
              <div className="flex flex-wrap gap-2">
                {dislikedTags.map(tag => (
                  <span key={tag} className="text-xs bg-destructive/10 text-destructive rounded-full px-3 py-1.5 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleConfirm}
          className="w-full bg-gradient-cta text-primary-foreground rounded-2xl py-4 text-base font-bold shadow-orange-glow hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
        >
          Save Preferences <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  const currentTemplate = templates[currentIndex];
  const nextTemplate = templates[currentIndex + 1];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Which style do you prefer?</h2>
        <p className="text-muted-foreground text-sm">
          Swipe right for like, left for dislike. AI learns from this.
        </p>
      </div>

      {/* Card stack */}
      <div className="relative w-full max-w-[360px] mx-auto" style={{ height: 440 }}>
        {nextTemplate && (
          <SwipeCard template={nextTemplate} onSwipe={() => {}} isTop={false} />
        )}
        {currentTemplate && (
          <AnimatePresence>
            <SwipeCard
              key={currentTemplate.id}
              template={currentTemplate}
              onSwipe={handleSwipe}
              isTop={true}
            />
          </AnimatePresence>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => handleSwipe('left')}
          className="w-14 h-14 rounded-full border-2 border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
        >
          <ThumbsDown size={22} />
        </button>
        <button
          onClick={() => handleSwipe('right')}
          className="w-14 h-14 rounded-full border-2 border-[hsl(var(--brand-green))]/30 flex items-center justify-center text-[hsl(var(--brand-green))] hover:bg-[hsl(var(--brand-green))]/10 transition-colors"
        >
          <Heart size={22} />
        </button>
      </div>

      {/* Progress */}
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          {swiped} of {total} reviewed
        </p>
        <div className="flex justify-center gap-1.5">
          {templates.slice(0, Math.min(total, 10)).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < swiped ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
        {canFinish && !showSummary && (
          <button
            onClick={handleFinish}
            className="text-sm text-primary font-semibold hover:underline mt-2"
          >
            Done — see results
          </button>
        )}
      </div>

      <button
        onClick={onSkip}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Skip for now →
      </button>
    </div>
  );
};

export default StyleCalibration;
