import { Skeleton } from "@/components/Skeleton";

export default function LogLoading() {
  return (
    <div className="space-y-6">
      {/* Back link + title + subtitle */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-12 rounded" />
        <Skeleton className="h-7 w-32 rounded" />
        <Skeleton className="h-3 w-52 rounded" />
      </div>

      {/* Battery % card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-4">
        <Skeleton className="h-3 w-16 rounded" />
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-14 w-24 rounded" />
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
        {/* Quick chips */}
        <div className="grid grid-cols-6 gap-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-lg" />
          ))}
        </div>
        {/* Range preview */}
        <div className="border-t border-neutral-800 pt-3 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-7 w-16 rounded" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-7 w-16 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* When */}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-14 rounded" />
        <Skeleton className="h-12 rounded-xl" />
      </div>

      {/* Note */}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-12 rounded-xl" />
      </div>

      {/* Save button */}
      <Skeleton className="h-14 rounded-2xl" />
    </div>
  );
}
