import { Skeleton } from "@/components/Skeleton";

export default function TripsLoading() {
  return (
    <div className="space-y-6">
      {/* Back link + title + subtitle */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-12 rounded" />
        <Skeleton className="h-7 w-20 rounded" />
        <Skeleton className="h-3 w-72 rounded" />
      </div>

      {/* Calibration stats — solo vs passenger */}
      <div className="grid grid-cols-2 divide-x divide-neutral-800 rounded-2xl border border-neutral-800 bg-neutral-900/50">
        <div className="space-y-1.5 px-3 py-3 text-center">
          <Skeleton className="mx-auto h-6 w-14 rounded" />
          <Skeleton className="mx-auto h-3 w-28 rounded" />
        </div>
        <div className="space-y-1.5 px-3 py-3 text-center">
          <Skeleton className="mx-auto h-6 w-14 rounded" />
          <Skeleton className="mx-auto h-3 w-28 rounded" />
        </div>
      </div>

      {/* Drawer button */}
      <div className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <Skeleton className="h-3 w-20 rounded" />
      </div>

      {/* Recent trips heading */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-24 rounded" />

        {/* Trip cards */}
        <ul className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <li
              key={i}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-10 rounded" />
                <Skeleton className="h-3 w-3 rounded" />
                <Skeleton className="h-5 w-10 rounded" />
                <Skeleton className="ml-auto h-3 w-20 rounded" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
