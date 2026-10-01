/**
 * Skeleton — loading shimmer for cards, tables, charts.
 */

export function SkeletonLine({ width = "100%", height = 12, className = "" }) {
  return (
    <div
      className={`animate-pulse rounded bg-bg-hover ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard({ height = 120 }) {
  return (
    <div
      className="card flex flex-col justify-between p-5"
      style={{ minHeight: height }}
    >
      <SkeletonLine width="40%" height={10} />
      <div className="mt-4 space-y-3">
        <SkeletonLine width="60%" height={28} />
        <SkeletonLine width="30%" height={10} />
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 260 }) {
  return (
    <div className="card p-6">
      <SkeletonLine width="30%" height={12} />
      <div className="mt-6 flex items-end gap-2" style={{ height }}>
        {[40, 65, 50, 80, 55, 70, 45, 85, 60, 75, 55, 90].map((h, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-bg-hover"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-6 py-4">
        <SkeletonLine width="25%" height={12} />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-6 py-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="flex-1">
                <SkeletonLine width="70%" height={12} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}