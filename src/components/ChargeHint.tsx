import type { ChargeHint } from "@/lib/calibration";

export function ChargeHintLine({ hint }: { hint: ChargeHint }) {
  const styles: Record<ChargeHint["severity"], { bg: string; dot: string; text: string }> = {
    good: {
      bg: "border-emerald-500/20 bg-emerald-500/5",
      dot: "bg-emerald-400",
      text: "text-emerald-300",
    },
    soon: {
      bg: "border-amber-500/20 bg-amber-500/5",
      dot: "bg-amber-400",
      text: "text-amber-300",
    },
    now: {
      bg: "border-red-500/30 bg-red-500/10",
      dot: "bg-red-400",
      text: "text-red-300",
    },
  };
  const s = styles[hint.severity];
  return (
    <div className={`mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${s.bg}`}>
      <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
      <span className={s.text}>{hint.label}</span>
    </div>
  );
}
