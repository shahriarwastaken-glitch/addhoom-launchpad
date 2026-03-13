import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export type MascotVariant =
  | 'happy'
  | 'sad'
  | 'sheepish'
  | 'celebrating'
  | 'energetic'
  | 'worried'
  | 'detective'
  | 'ai';

const MASCOT_PATHS: Record<MascotVariant, string> = {
  happy: '/mascot/mascot-happy.png',
  sad: '/mascot/mascot-sad.webp',
  sheepish: '/mascot/mascot-sheepish.webp',
  celebrating: '/mascot/mascot-celebrating.webp',
  energetic: '/mascot/mascot-energetic.webp',
  worried: '/mascot/mascot-worried.webp',
  detective: '/mascot/mascot-detective.webp',
  ai: '/mascot/mascot-ai.webp',
};

// Preload all mascot variants once on first mount
let preloaded = false;

function preloadMascots() {
  if (preloaded) return;
  preloaded = true;
  Object.values(MASCOT_PATHS).forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

interface MascotProps {
  variant: MascotVariant;
  size?: number;
  animate?: boolean;
  priority?: boolean;
  className?: string;
}

export function Mascot({ variant, size = 80, animate = false, priority = false, className }: MascotProps) {
  useEffect(() => {
    preloadMascots();
  }, []);

  return (
    <img
      src={MASCOT_PATHS[variant]}
      alt={`AdDhoom mascot — ${variant}`}
      width={size}
      height={size}
      className={cn(
        'object-contain select-none',
        animate && 'animate-mascot-float',
        variant === 'celebrating' && 'animate-mascot-celebrate',
        className
      )}
      loading={priority ? 'eager' : 'lazy'}
      style={{ width: size, height: size }}
    />
  );
}

export default Mascot;
