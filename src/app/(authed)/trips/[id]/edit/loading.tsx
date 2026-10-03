import { Skeleton } from "@/components/Skeleton";

export default function TripEditLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-12 rounded" />
        <Skeleton className="h-7 w-28 rounded" />
        <Skeleton className="h-3 w-64 rounded" />
      </div>
      <Skeleton className="h-[360px] rounded-[22px]" />
    </div>
  );
}
