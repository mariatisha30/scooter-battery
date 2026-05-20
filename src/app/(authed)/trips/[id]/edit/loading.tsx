import { Skeleton } from "@/components/Skeleton";

export default function TripEditLoading() {
  return (
    <div className="space-y-6">
      {/* Back link + title + subtitle */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-12 rounded" />
        <Skeleton className="h-7 w-24 rounded" />
        <Skeleton className="h-3 w-60 rounded" />
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-3">
        {/* Solo / Passenger toggle */}
        <div className="flex gap-2 rounded-xl bg-neutral-950 p-1">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>

        {/* Start / End / KM */}
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-10 rounded" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          ))}
        </div>

        {/* When */}
        <div className="space-y-1">
          <Skeleton className="h-3 w-14 rounded" />
          <Skeleton className="h-10 rounded-lg" />
        </div>

        {/* Note */}
        <div className="space-y-1">
          <Skeleton className="h-3 w-14 rounded" />
          <Skeleton className="h-10 rounded-lg" />
        </div>

        {/* Cancel + Save row */}
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 flex-[2] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
