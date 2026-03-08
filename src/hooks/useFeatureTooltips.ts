import { useState, useEffect, useCallback } from 'react';

type TooltipKey = 'dhoom_score' | 'winner_star' | 'remix_button' | 'calendar_generate';

const TOOLTIP_STORAGE_KEY = 'addhoom_feature_tooltips';

const TOOLTIPS: Record<TooltipKey, { emoji: string; text: string }> = {
  dhoom_score: { emoji: '🎯', text: 'Higher score = better ad performance.' },
  winner_star: { emoji: '⭐', text: 'Mark great ads as winners so the AI learns your taste.' },
  remix_button: { emoji: '🔄', text: 'Remix a winning ad to generate an even better version.' },
  calendar_generate: { emoji: '📅', text: 'Generate a 90-day content plan in one click.' },
};

export const useFeatureTooltips = () => {
  const [shown, setShown] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(TOOLTIP_STORAGE_KEY) || '{}');
      setShown(stored);
    } catch {
      setShown({});
    }
  }, []);

  const shouldShow = useCallback((key: TooltipKey) => !shown[key], [shown]);

  const dismiss = useCallback((key: TooltipKey) => {
    setShown(prev => {
      const next = { ...prev, [key]: true };
      localStorage.setItem(TOOLTIP_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getTooltip = useCallback((key: TooltipKey) => TOOLTIPS[key], []);

  return { shouldShow, dismiss, getTooltip };
};
