export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-xl ${className}`}/>;
}

export function PlayerAppSkeleton() {
  return <div className="space-y-5">
    <SkeletonBlock className="h-10 w-32"/>
    <SkeletonBlock className="h-44 w-full rounded-3xl"/>
    <div className="space-y-3"><SkeletonBlock className="h-24 w-full"/><SkeletonBlock className="h-24 w-full"/></div>
  </div>;
}

export function AdminPanelSkeleton() {
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} className="h-24"/>)}</div>
    <SkeletonBlock className="h-12 w-full"/>
    <SkeletonBlock className="h-72 w-full rounded-2xl"/>
  </div>;
}
