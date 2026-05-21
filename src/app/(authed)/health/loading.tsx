import { Skeleton } from "@/components/Skeleton";

export default function HealthLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-12 rounded" />
        <Skeleton className="h-7 w-44 rounded" />
        <Skeleton className="h-3 w-72 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900/50 px-3 py-2.5">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-7 w-20 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-32 rounded" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-28 rounded" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
