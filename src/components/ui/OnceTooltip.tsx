import * as React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const STORAGE_PREFIX = 'tooltip_seen_';

/**
 * A tooltip that only shows on first encounter.
 * After the user sees it once, it never appears again (tracked via localStorage).
 * Use `resetAllTooltips()` to clear all seen states.
 */
interface OnceTooltipProps {
  id: string;
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  className?: string;
}

const OnceTooltip = ({ id, content, side = 'top', children, className }: OnceTooltipProps) => {
  const storageKey = `${STORAGE_PREFIX}${id}`;
  const [seen, setSeen] = React.useState(() => {
    try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; }
  });

  const handleOpenChange = (open: boolean) => {
    if (open && !seen) {
      localStorage.setItem(storageKey, 'true');
      setSeen(true);
    }
  };

  if (seen) {
    return <>{children}</>;
  }

  return (
    <Tooltip onOpenChange={handleOpenChange}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
};

/** Clears all tooltip_seen_* keys from localStorage */
export const resetAllTooltips = () => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  // Also clear the FeatureTooltip storage
  localStorage.removeItem('addhoom_feature_tooltips');
};

export default OnceTooltip;
