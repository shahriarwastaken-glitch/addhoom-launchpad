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
  sad: '/mascot/mascot-sad.png',
  sheepish: '/mascot/mascot-sheepish.png',
  celebrating: '/mascot/mascot-celebrating.png',
  energetic: '/mascot/mascot-energetic.png',
  worried: '/mascot/mascot-worried.png',
  detective: '/mascot/mascot-detective.png',
  ai: '/mascot/mascot-ai.png',
};

interface MascotProps {
  variant: MascotVariant;
  size?: number;
  animate?: boolean;
  priority?: boolean;
  className?: string;
}

export function Mascot({ variant, size = 80, animate = false, priority = false, className }: MascotProps) {
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
