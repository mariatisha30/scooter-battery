import { Skeleton } from "@/components/Skeleton";

export default function HealthLoading() {
  return (
    <div className="space-y-7 pt-2">
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-44 rounded" />
        <Skeleton className="h-5 w-40 rounded-full" />
        <Skeleton className="h-3 w-72 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-[22px]" />
        ))}
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-64 rounded-[22px]" />
      </div>
    </div>
  );
}
