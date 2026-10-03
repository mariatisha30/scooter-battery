import { IconBolt } from "@tabler/icons-react";

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center bg-linear-to-br from-acc to-acc2 text-acc-ink shadow-[0_6px_20px_-6px_var(--acc)]"
      style={{ width: size, height: size, borderRadius: size * 0.34 }}
      aria-hidden
    >
      <IconBolt size={size * 0.56} stroke={2} />
    </span>
  );
}
