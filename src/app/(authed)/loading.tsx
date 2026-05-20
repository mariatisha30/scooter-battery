import { Skeleton } from "@/components/Skeleton";

// Shape mirrors the dashboard — most-visited page after login.
// Edit / log / trips routes also use this since it's the closest layout
// to "any authed page" and avoids flashing two different skeletons.
export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Hero card with battery ring + bottom stats */}
      <section className="rounded-3xl border border-neutral-800 bg-gradient-to-b from-neutral-900/80 to-neutral-950/40 px-6 pb-7 pt-6">
        <Skeleton className="mx-auto mb-5 h-8 w-48 rounded-full" />
        <div className="flex justify-center">
          <Skeleton className="h-60 w-60 rounded-full" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-6 border-t border-neutral-800 pt-5">
          <div className="space-y-1.5">
            <Skeleton className="mx-auto h-5 w-20 rounded" />
            <Skeleton className="mx-auto h-3 w-24 rounded" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="mx-auto h-5 w-20 rounded" />
            <Skeleton className="mx-auto h-3 w-24 rounded" />
          </div>
        </div>
      </section>

      {/* Primary CTA */}
      <Skeleton className="h-14 rounded-2xl" />

      {/* Stats strip */}
      <Skeleton className="h-16 rounded-2xl" />

      {/* History chart */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>

      {/* Recent list */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-20 rounded" />
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50 divide-y divide-neutral-800">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
