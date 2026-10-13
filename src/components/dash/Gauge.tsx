// Dashboard dial: 53 ticks over a 260° sweep, lit up to the charge. The
// charging variant puts a liquid orb inside the same dial so plugging in
// doesn't move the layout.

type Ramp = "lime" | "teal";

const RAMPS: Record<Ramp, [number[], number[]]> = {
  lime: [[52, 211, 153], [196, 242, 75]],
  teal: [[16, 185, 129], [94, 234, 212]],
};
const TICKS = 52;
const START = 140;
const SWEEP = 260;
const C = 150;

function pt(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [+(C + r * Math.cos(a)).toFixed(2), +(C + r * Math.sin(a)).toFixed(2)];
}
function mix(a: number[], b: number[], t: number) {
  return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(" ")})`;
}

export function Gauge({ soc, ramp = "lime", children }: { soc: number | null; ramp?: Ramp; children?: React.ReactNode }) {
  const [from, to] = RAMPS[ramp];
  return (
    <div className="relative mx-auto h-[252px] w-[300px]">
      <svg viewBox="0 0 300 300" className="absolute left-0 top-0 h-[300px] w-[300px]" aria-hidden>
        {Array.from({ length: TICKS + 1 }, (_, i) => {
          const pct = (i / TICKS) * 100;
          const deg = START + (SWEEP * i) / TICKS;
          const major = i % 13 === 0;
          const [x1, y1] = pt(major ? 106 : 113, deg);
          const [x2, y2] = pt(128, deg);
          const lit = soc !== null && pct <= soc;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={lit ? mix(from, to, pct / 100) : "rgb(255 255 255 / 0.07)"}
              strokeWidth={major ? 3.2 : 2.4}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {children}
      <span className="num absolute left-[72px] top-[226px] text-[13px] font-semibold text-dim" aria-hidden>
        E
      </span>
      <span className="num absolute right-[72px] top-[226px] text-[13px] font-semibold text-dim" aria-hidden>
        F
      </span>
    </div>
  );
}

/**
 * A big condensed number. By default the unit hangs off to the right in a
 * zero-width box so the DIGITS are centred; `inlineUnit` centres number and
 * unit together.
 */
export function BigNumber({
  value,
  unit,
  size,
  unitSize,
  className = "",
  unitClassName = "text-muted",
  inlineUnit = false,
}: {
  value: string;
  unit: string;
  size: number;
  unitSize: number;
  className?: string;
  unitClassName?: string;
  inlineUnit?: boolean;
}) {
  return (
    <span className={`num font-bold tracking-[-0.02em] ${className}`} style={{ fontSize: size, lineHeight: 0.82 }}>
      {value}
      <span className={inlineUnit ? "" : "inline-block w-0 whitespace-nowrap"}>
        <span className={`ml-[3px] font-semibold tracking-normal ${unitClassName}`} style={{ fontSize: unitSize }}>
          {unit}
        </span>
      </span>
    </span>
  );
}

const WAVE = "M0 5 Q 15 0 30 5 T 60 5 T 90 5 T 120 5 T 150 5 T 180 5 T 210 5 T 240 5 V10 H0 Z";

/** Liquid inside the dial (charging): fills to the SOC with a moving wave. */
export function LiquidOrb({ soc }: { soc: number }) {
  return (
    <div className="absolute left-[50px] top-[50px] h-[200px] w-[200px] overflow-hidden rounded-full bg-white/[0.025] shadow-[inset_0_0_0_1px_var(--color-line)]">
      <div
        className="absolute inset-x-0 bottom-0 bg-linear-to-b from-[#5eead4]/90 via-[#10b981]/75 to-[#065f46]/80 transition-[height] duration-700"
        style={{ height: `${Math.max(0, Math.min(100, soc))}%` }}
      >
        <svg
          className="absolute -top-[9px] left-0 h-2.5 w-[200%] animate-wave"
          viewBox="0 0 240 10"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={WAVE} fill="#5eead4" fillOpacity={0.9} />
        </svg>
        <div className="absolute inset-0 bg-linear-to-r from-white/15 via-transparent to-black/15" />
        {[
          ["26%", "0s", 5],
          ["58%", "1.2s", 5],
          ["42%", "2.3s", 4],
        ].map(([left, delay, s]) => (
          <span
            key={left as string}
            className="absolute bottom-2.5 animate-rise rounded-full bg-white/55 opacity-0"
            style={{ left: left as string, animationDelay: delay as string, width: s as number, height: s as number }}
          />
        ))}
      </div>
    </div>
  );
}
