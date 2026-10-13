import { Skeleton } from "@/components/Skeleton";

// Mirrors the dashboard — the most-visited page.
export default function Loading() {
  return (
    <div className="pt-1">
      <div className="relative mx-auto h-[252px] w-[300px]">
        <Skeleton className="absolute left-[22px] top-[22px] h-[256px] w-[256px] rounded-full opacity-60" />
      </div>
      <Skeleton className="mt-1 h-12 rounded-2xl" />
      <Skeleton className="mt-2.5 h-[214px] rounded-[22px]" />
      <Skeleton className="mt-2.5 h-[248px] rounded-[22px]" />
    </div>
  );
}
