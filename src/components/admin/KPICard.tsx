import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'error' | 'info';
  subtitle?: string;
  className?: string;
}

export default function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  badge, 
  badgeType = 'success',
  subtitle,
  className 
}: KPICardProps) {
  const badgeColors = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className={cn(
      'bg-card rounded-xl p-3 md:p-4 shadow-sm border border-border',
      className
    )}>
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground min-w-0">
          <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
          <span className="text-xs md:text-sm truncate">{title}</span>
        </div>
        {badge && (
          <span className={cn('text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0', badgeColors[badgeType])}>
            {badge}
          </span>
        )}
      </div>
      <div className="mt-1.5 md:mt-2">
        <div className="text-lg md:text-2xl font-bold text-foreground truncate">{value}</div>
        {subtitle && (
          <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
