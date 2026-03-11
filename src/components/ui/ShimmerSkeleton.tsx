/**
 * Reusable shimmer skeleton primitives for loading states.
 * Uses the .skeleton-shimmer class from index.css for the animation.
 */
import { cn } from '@/lib/utils';

interface ShimmerProps {
  className?: string;
}

export const ShimmerBlock = ({ className }: ShimmerProps) => (
  <div className={cn('skeleton-shimmer', className)} />
);

/** Skeleton for a stat/KPI card */
export const StatCardSkeleton = () => (
  <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
    <ShimmerBlock className="h-3 w-20" />
    <ShimmerBlock className="h-7 w-28" />
    <ShimmerBlock className="h-2 w-full" />
  </div>
);

/** Skeleton for an image gallery card */
export const ImageCardSkeleton = () => (
  <div className="bg-card border border-border rounded-xl overflow-hidden">
    <ShimmerBlock className="aspect-square w-full rounded-none" />
    <div className="p-3 space-y-2">
      <ShimmerBlock className="h-3 w-3/4" />
      <ShimmerBlock className="h-3 w-1/2" />
    </div>
  </div>
);

/** Skeleton for a text list row */
export const ListRowSkeleton = () => (
  <div className="flex items-center gap-3 py-3 px-4 border-b border-border">
    <ShimmerBlock className="w-8 h-8 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <ShimmerBlock className="h-3 w-2/3" />
      <ShimmerBlock className="h-2.5 w-1/3" />
    </div>
    <ShimmerBlock className="h-6 w-16 rounded-full" />
  </div>
);

/** Skeleton for a table */
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="border border-border rounded-xl overflow-hidden">
    {/* Header */}
    <div className="flex gap-4 px-4 py-3 bg-secondary/50 border-b border-border">
      {[1, 2, 3, 4].map(i => (
        <ShimmerBlock key={i} className="h-3 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 px-4 py-3 border-b border-border last:border-0">
        {[1, 2, 3, 4].map(j => (
          <ShimmerBlock key={j} className="h-3 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

/** Skeleton grid for galleries / product grids */
export const GridSkeleton = ({ count = 6, cols = 'grid-cols-2 md:grid-cols-3' }: { count?: number; cols?: string }) => (
  <div className={cn('grid gap-3', cols)}>
    {Array.from({ length: count }).map((_, i) => (
      <ImageCardSkeleton key={i} />
    ))}
  </div>
);

/** Skeleton for calendar grid */
export const CalendarSkeleton = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <ShimmerBlock className="h-6 w-32" />
      <ShimmerBlock className="h-8 w-24 rounded-full" />
    </div>
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <ShimmerBlock key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  </div>
);

/** Full-page skeleton matching the PageSkeleton in Dashboard.tsx */
export const PageSkeleton = () => (
  <div className="p-6 space-y-4">
    <ShimmerBlock className="h-8 w-48" />
    <ShimmerBlock className="h-4 w-72" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
    <ShimmerBlock className="h-64 rounded-2xl mt-4" />
  </div>
);
