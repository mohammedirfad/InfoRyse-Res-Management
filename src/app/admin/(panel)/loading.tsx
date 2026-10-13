export default function AdminLoading() {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50/70 p-6 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="h-16 bg-gray-200/80 rounded-2xl mb-6 w-full" />

      {/* Grid cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="h-28 bg-gray-200/70 rounded-2xl" />
        <div className="h-28 bg-gray-200/70 rounded-2xl" />
        <div className="h-28 bg-gray-200/70 rounded-2xl" />
        <div className="h-28 bg-gray-200/70 rounded-2xl" />
      </div>

      {/* Content panel skeleton */}
      <div className="flex-1 bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="h-8 bg-gray-200/70 rounded-xl w-1/3" />
        <div className="h-4 bg-gray-100 rounded-lg w-1/2" />
        <div className="h-40 bg-gray-100/60 rounded-2xl w-full" />
      </div>
    </div>
  );
}
