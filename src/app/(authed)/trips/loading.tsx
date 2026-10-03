import { Skeleton } from "@/components/Skeleton";

export default function TripsLoading() {
  return (
    <div className="space-y-7 pt-2">
      <div className="space-y-2">
        <Skeleton className="h-7 w-20 rounded" />
        <Skeleton className="h-3 w-64 rounded" />
      </div>
      <Skeleton className="h-[78px] rounded-[22px]" />
      <Skeleton className="h-[60px] rounded-[22px]" />
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-24 rounded" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-[22px]" />
        ))}
      </div>
    </div>
  );
}
