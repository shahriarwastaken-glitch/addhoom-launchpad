import { useState, useEffect, useCallback } from 'react';

type TooltipKey = 'dhoom_score' | 'winner_star' | 'remix_button' | 'calendar_generate';

const TOOLTIP_STORAGE_KEY = 'addhoom_feature_tooltips';

const TOOLTIPS: Record<TooltipKey, { emoji: string; text: string }> = {
  dhoom_score: { emoji: '🎯', text: 'এই স্কোর যত বেশি, বিজ্ঞাপন তত ভালো কাজ করবে' },
  winner_star: { emoji: '⭐', text: 'ভালো বিজ্ঞাপনে স্টার দিন — AI শিখবে' },
  remix_button: { emoji: '🔄', text: 'বিজয়ী বিজ্ঞাপন থেকে শিখে আরো ভালো করুন' },
  calendar_generate: { emoji: '📅', text: '৯০ দিনের পরিকল্পনা একবারে তৈরি করুন' },
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
