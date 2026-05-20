import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xs space-y-4">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-3 w-40 rounded" />
        </div>
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-11 rounded-xl" />
      </div>
    </div>
  );
}
