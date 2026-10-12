/**
 * Reusable skeleton loader components for admin pages.
 * Uses CSS animation via globals.css @keyframes pulse.
 */

export function SkeletonLine({ w = "w-full", h = "h-4" }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-gray-200 rounded-lg animate-pulse`} />;
}

export function SkeletonKpiCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-9 w-9 rounded-xl bg-gray-200 animate-pulse" />
        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

export function SkeletonOrderCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-36 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonMenuCard() {
  return (
    <div className="card overflow-hidden">
      <div className="h-36 bg-gray-200 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <tr>
      {[1,2,3,4].map(i => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${40+i*15}%` }} />
        </td>
      ))}
    </tr>
  );
}
