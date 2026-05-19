"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function Toast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const hide = setTimeout(() => setVisible(false), 2400);
    const clear = setTimeout(() => {
      router.replace(pathname, { scroll: false });
    }, 3000);
    return () => {
      clearTimeout(hide);
      clearTimeout(clear);
    };
  }, [pathname, router]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2 transform transition-all duration-300 ${
        mounted && visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-3 opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-200 shadow-lg shadow-emerald-500/10 backdrop-blur">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-emerald-950">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {message}
      </div>
    </div>
  );
}
