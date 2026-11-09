export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function TournamentCardSkeleton() {
  return (
    <div className="neo p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-6 w-3/4 max-w-sm" />
        </div>
        <SkeletonBlock className="h-7 w-20 shrink-0" />
      </div>
      <SkeletonBlock className="h-4 w-full" />
      <div className="border-2 border-black bg-[#F4EFE6] dark:bg-[#121316] p-3 space-y-2">
        <div className="flex justify-between">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-3 w-16" />
        </div>
        <SkeletonBlock className="h-3.5 w-full" />
      </div>
      <div className="flex justify-between pt-1">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-6 w-24" />
      </div>
    </div>
  );
}

export function PlayerAppSkeleton() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F4EFE6] dark:bg-[#0D0E12] text-black dark:text-white transition-colors">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 md:grid md:grid-cols-[240px_minmax(0,1fr)] md:pb-8">
        {/* Desktop Sidebar Skeleton */}
        <aside className="hidden md:block space-y-4">
          <div className="border-[3px] border-black bg-[#C6F36B] p-4 shadow-[4px_4px_0px_#000000]">
            <SkeletonBlock className="h-7 w-32 bg-black/20" />
            <SkeletonBlock className="mt-2 h-3 w-20 bg-black/20" />
          </div>
          <div className="border-[3px] border-black bg-white dark:bg-[#1a1c23] p-2 space-y-2 shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#c6f36b]">
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
        </aside>

        {/* Main Content Skeleton */}
        <main className="min-w-0 space-y-6">
          {/* Header Skeleton */}
          <header className="flex items-center justify-between gap-3 border-b-2 border-black pb-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-8 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-8 w-16 rounded-full" />
              <SkeletonBlock className="h-12 w-12" />
            </div>
          </header>

          {/* Hero Banner Skeleton */}
          <div className="border-[3px] border-black bg-[#C6F36B] p-6 shadow-[6px_6px_0px_#000000] space-y-4">
            <div className="flex justify-between">
              <SkeletonBlock className="h-5 w-36 bg-black/20" />
              <SkeletonBlock className="h-6 w-6 bg-black/20" />
            </div>
            <SkeletonBlock className="h-4 w-44 bg-black/20" />
            <SkeletonBlock className="h-12 w-3/4 max-w-sm bg-black/20" />
            <SkeletonBlock className="h-4 w-2/3 max-w-md bg-black/20" />
          </div>

          {/* Tournament Cards Skeleton */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <SkeletonBlock className="h-6 w-44" />
              <SkeletonBlock className="h-8 w-24" />
            </div>
            <TournamentCardSkeleton />
            <TournamentCardSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}

export function AdminPanelSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top Bar Skeleton */}
      <div className="neo p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10" />
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-6 w-48" />
          </div>
        </div>
        <SkeletonBlock className="h-10 w-36" />
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="border-[3px] border-black bg-white dark:bg-[#1a1c23] p-4 shadow-[4px_4px_0px_#000000] dark:shadow-[4px_4px_0px_#c6f36b] space-y-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="neo p-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <SkeletonBlock className="h-11 w-full" />
        <SkeletonBlock className="h-11 w-full" />
        <SkeletonBlock className="h-11 w-full" />
        <SkeletonBlock className="h-11 w-full" />
      </div>

      {/* Card Content Skeleton */}
      <div className="neo p-6 space-y-4">
        <SkeletonBlock className="h-6 w-48" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
    </div>
  );
}

export function RegistrationPanelSkeleton() {
  return (
    <div aria-label="Loading team registration" className="neo p-6 sm:p-8 space-y-4">
      <div className="flex items-center justify-between border-b-2 border-black pb-4">
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-3 w-64 max-w-full" />
        </div>
        <SkeletonBlock className="h-7 w-24 shrink-0 hidden sm:block" />
      </div>

      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-12 w-full" />
        </div>
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-40" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
        </div>
      </div>

      <SkeletonBlock className="h-14 w-full mt-4" />
    </div>
  );
}
