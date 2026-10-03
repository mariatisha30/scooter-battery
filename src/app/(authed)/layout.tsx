import Link from "next/link";
import { BmsPill } from "@/components/bms/BmsPill";
import { BmsProvider } from "@/components/bms/BmsProvider";
import { BrandMark } from "@/components/BrandMark";
import { Dock } from "@/components/Dock";
import { OfflineSync } from "@/components/OfflineSync";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

// The BMS link lives here, above every page, so it stays connected while you
// move between Dash, Health and Trips — and themes the app by its state.
export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <BmsProvider>
      <div className="mx-auto max-w-md px-4 pb-32 pt-[max(8px,env(safe-area-inset-top))]">
        <ServiceWorkerRegister />
        <header className="flex h-[52px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
            <BrandMark />
            Scooter
          </Link>
          <BmsPill />
        </header>
        <OfflineSync />
        <main className="mt-1">{children}</main>
      </div>
      <Dock />
    </BmsProvider>
  );
}
