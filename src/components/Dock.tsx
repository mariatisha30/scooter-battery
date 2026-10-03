"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconGauge, IconHeartRateMonitor, IconRoute } from "@tabler/icons-react";

const TABS = [
  { href: "/", label: "Dash", icon: IconGauge, match: (p: string) => p === "/" || p.startsWith("/log") },
  { href: "/health", label: "Health", icon: IconHeartRateMonitor, match: (p: string) => p.startsWith("/health") },
  { href: "/trips", label: "Trips", icon: IconRoute, match: (p: string) => p.startsWith("/trips") },
];

/** Floating bottom navigation. The active tab shows its label. */
export function Dock() {
  const pathname = usePathname() ?? "/";
  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[calc(env(safe-area-inset-bottom)+20px)]"
    >
      <div className="pointer-events-auto flex gap-1.5 rounded-full bg-[rgb(18_24_20/0.78)] p-1.5 shadow-[inset_0_0_0_1px_var(--color-line),0_12px_40px_rgb(0_0_0/0.5)] backdrop-blur-xl">
        {TABS.map(({ href, label, icon: I, match }) => {
          const on = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={on ? "page" : undefined}
              className={`flex h-12 items-center gap-2 rounded-full px-[18px] text-[13px] transition-colors ${
                on
                  ? "bg-linear-to-br from-acc to-acc2 font-semibold text-acc-ink"
                  : "font-medium text-muted hover:text-fg"
              }`}
            >
              <I size={21} stroke={1.75} aria-hidden />
              {on && label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
