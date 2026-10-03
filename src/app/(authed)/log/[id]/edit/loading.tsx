import { Skeleton } from "@/components/Skeleton";

export default function LogEditLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-12 rounded" />
        <Skeleton className="h-7 w-32 rounded" />
        <Skeleton className="h-3 w-60 rounded" />
      </div>
      <Skeleton className="h-36 rounded-[22px]" />
      <Skeleton className="h-12 rounded-2xl" />
      <Skeleton className="h-12 rounded-2xl" />
      <div className="flex gap-2">
        <Skeleton className="h-12 flex-1 rounded-2xl" />
        <Skeleton className="h-12 flex-[2] rounded-2xl" />
      </div>
    </div>
  );
}
