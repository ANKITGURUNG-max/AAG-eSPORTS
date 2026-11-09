export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function PlayerAppSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-10 w-36" />
      <SkeletonBlock className="h-48 w-full" />
      <div className="space-y-4">
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-28 w-full" />
      </div>
    </div>
  );
}

export function AdminPanelSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonBlock key={index} className="h-28" />
        ))}
      </div>
      <SkeletonBlock className="h-14 w-full" />
      <SkeletonBlock className="h-80 w-full" />
    </div>
  );
}

export function RegistrationPanelSkeleton() {
  return (
    <div aria-label="Loading team registration" className="space-y-4 border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_#000000]">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-4 w-60 max-w-full" />
        </div>
      </div>
      <SkeletonBlock className="h-12 w-full" />
      <div className="space-y-2">
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
      <SkeletonBlock className="h-12 w-full" />
    </div>
  );
}
