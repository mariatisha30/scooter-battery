// A single CSS class wrapper for a pulsing placeholder block.
// Compose shape via the className prop (height, width, rounded-*).
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-white/[0.06] ${className}`}
      aria-hidden="true"
    />
  );
}
