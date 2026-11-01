export default function GuestFlowLoading() {
  return (
    <div className="min-h-screen bg-[#FBF7F1] px-4 pt-6">
      <div className="mx-auto max-w-lg animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-200" />
          <div className="space-y-2">
            <div className="h-3 w-32 rounded bg-gray-200" />
            <div className="h-2.5 w-20 rounded bg-gray-100" />
          </div>
        </div>
        <div className="h-24 rounded-3xl bg-gray-200/80" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 rounded-2xl bg-gray-100" />
          <div className="h-28 rounded-2xl bg-gray-100" />
        </div>
        <div className="h-20 rounded-3xl bg-gray-100" />
      </div>
    </div>
  );
}
