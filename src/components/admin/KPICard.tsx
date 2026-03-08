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
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className={cn(
      'bg-card rounded-xl p-4 shadow-sm border border-border',
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-sm">{title}</span>
        </div>
        {badge && (
          <span className={cn('text-xs px-2 py-0.5 rounded-full', badgeColors[badgeType])}>
            {badge}
          </span>
        )}
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
