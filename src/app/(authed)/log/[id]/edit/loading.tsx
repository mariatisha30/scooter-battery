import { Skeleton } from "@/components/Skeleton";

export default function LogEditLoading() {
  return (
    <div className="space-y-6">
      {/* Back link + title + subtitle */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-12 rounded" />
        <Skeleton className="h-7 w-32 rounded" />
        <Skeleton className="h-3 w-60 rounded" />
      </div>

      {/* Battery % card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-3">
        <Skeleton className="h-3 w-16 rounded" />
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-14 w-24 rounded" />
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Skeleton className="h-3 w-14 rounded" />
        <Skeleton className="h-12 rounded-xl" />
      </div>

      <div className="space-y-1.5">
        <Skeleton className="h-3 w-14 rounded" />
        <Skeleton className="h-12 rounded-xl" />
      </div>

      {/* Cancel + Save row */}
      <div className="flex gap-2">
        <Skeleton className="h-12 flex-1 rounded-2xl" />
        <Skeleton className="h-12 flex-[2] rounded-2xl" />
      </div>
    </div>
  );
}
