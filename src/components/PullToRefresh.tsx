"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "./Spinner";

const PULL_THRESHOLD = 70;
const MAX_PULL = 110;

/**
 * Touch-driven swipe-down-to-refresh.
 *
 * On pull past threshold, calls window.__bmsSync if available (so BmsCard can
 * trigger a fresh BMS read), then router.refresh() to re-render the server
 * component with the new battery_log.
 *
 * Native Chrome pull-to-refresh is disabled with `overscroll-behavior: contain`
 * on the body so this gesture doesn't double up with browser reload.
 */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const trackingRef = useRef(false);

  useEffect(() => {
    document.body.style.overscrollBehavior = "contain";
    return () => {
      document.body.style.overscrollBehavior = "";
    };
  }, []);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshing) {
        trackingRef.current = false;
        return;
      }
      startY.current = e.touches[0].clientY;
      trackingRef.current = true;
    }
    function onTouchMove(e: TouchEvent) {
      if (!trackingRef.current || startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // resistance curve: feels naturally springy
      const resisted = Math.min(MAX_PULL, dy * 0.55);
      setPull(resisted);
      if (dy > 8) e.preventDefault();
    }
    async function onTouchEnd() {
      if (!trackingRef.current) return;
      trackingRef.current = false;
      const currentPull = pull;
      startY.current = null;
      if (currentPull >= PULL_THRESHOLD) {
        setRefreshing(true);
        setPull(PULL_THRESHOLD);
        try {
          const w = window as Window & { __bmsSync?: () => Promise<void> };
          if (w.__bmsSync) await w.__bmsSync();
        } catch {
          /* surfaced by BmsCard */
        }
        router.refresh();
        setTimeout(() => {
          setRefreshing(false);
          setPull(0);
        }, 350);
      } else {
        setPull(0);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, refreshing, router]);

  const ready = pull >= PULL_THRESHOLD;

  return (
    <>
      <div
        className="pointer-events-none fixed left-1/2 top-0 z-40 -translate-x-1/2 transition-transform"
        style={{ transform: `translate(-50%, ${pull - 50}px)` }}
        aria-hidden={pull === 0}
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-colors ${
            ready || refreshing
              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
              : "border-neutral-700 bg-neutral-900 text-neutral-400"
          }`}
        >
          {refreshing ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="transition-transform"
              style={{ transform: `rotate(${Math.min(180, (pull / PULL_THRESHOLD) * 180)}deg)` }}
            >
              <path
                d="M8 3v9M4 9l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: trackingRef.current ? "none" : "transform 250ms ease-out",
        }}
      >
        {children}
      </div>
    </>
  );
}
