export function CourseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden animate-pulse flex flex-col"
        >
          {/* Media Skeleton */}
          <div className="aspect-video w-full bg-muted/40" />

          {/* Body Skeleton */}
          <div className="p-5 space-y-4 flex-1 flex flex-col">
            <div className="h-3 w-24 bg-muted/50 rounded" />
            <div className="space-y-2">
              <div className="h-5 w-5/6 bg-muted/60 rounded" />
              <div className="h-4 w-full bg-muted/30 rounded" />
            </div>

            {/* Instructor */}
            <div className="flex items-center gap-2 pt-2">
              <div className="h-7 w-7 rounded-full bg-muted/50" />
              <div className="h-3.5 w-28 bg-muted/40 rounded" />
            </div>

            {/* Metrics */}
            <div className="flex items-center justify-between pt-3 border-t border-border/30">
              <div className="h-3 w-16 bg-muted/30 rounded" />
              <div className="h-3 w-16 bg-muted/30 rounded" />
              <div className="h-3 w-16 bg-muted/30 rounded" />
            </div>

            {/* Price */}
            <div className="mt-auto pt-3 border-t border-border/30 flex items-center justify-between">
              <div className="h-6 w-20 bg-muted/60 rounded" />
              <div className="h-4 w-12 bg-muted/30 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
