type Props = {
  pct: number | null;
  remainingKm: number;
  floor: number;
};

type State = {
  ringColor: string;
  textColor: string;
  glow: string;
  label: string;
  labelBg: string;
};

function getState(pct: number | null, floor: number): State {
  if (pct === null) {
    return {
      ringColor: "#404040",
      textColor: "text-neutral-500",
      glow: "",
      label: "No reading yet",
      labelBg: "bg-neutral-800 text-neutral-400",
    };
  }
  if (pct <= floor) {
    return {
      ringColor: "#f87171",
      textColor: "text-red-400",
      glow: "drop-shadow-[0_0_24px_rgba(248,113,113,0.35)]",
      label: "Critical · don't ride",
      labelBg: "bg-red-500/15 text-red-300 border border-red-500/30",
    };
  }
  if (pct <= floor + 15) {
    return {
      ringColor: "#fbbf24",
      textColor: "text-amber-400",
      glow: "drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]",
      label: "Charge soon",
      labelBg: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    };
  }
  return {
    ringColor: "#34d399",
    textColor: "text-emerald-400",
    glow: "drop-shadow-[0_0_24px_rgba(52,211,153,0.3)]",
    label: "Good to ride",
    labelBg: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  };
}

export function BatteryRing({ pct, remainingKm, floor }: Props) {
  const state = getState(pct, floor);
  const size = 240;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  const offset = circumference * (1 - filled / 100);
  const floorAngle = (floor / 100) * 360;

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${state.glow}`} style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={state.ringColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={state.ringColor} stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1f1f1f" strokeWidth={stroke} />
          {pct !== null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)" }}
            />
          )}
          <g transform={`rotate(${floorAngle} ${size / 2} ${size / 2})`}>
            <line
              x1={size / 2}
              y1={stroke / 2 - 2}
              x2={size / 2}
              y2={stroke / 2 + stroke + 2}
              stroke="#f87171"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.6"
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {pct === null ? (
            <div className="text-5xl font-semibold leading-none text-neutral-500">—</div>
          ) : (
            <>
              <div className={`flex items-baseline tabular-nums leading-none ${state.textColor}`}>
                <span className="text-6xl font-semibold">{remainingKm.toFixed(0)}</span>
                <span className="ml-1 text-xl font-medium">km</span>
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-neutral-500">
                range left
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-sm tabular-nums text-neutral-300">
                <span className={`inline-block h-2 w-2 rounded-full`} style={{ background: state.ringColor }} />
                {pct}%
              </div>
            </>
          )}
        </div>
      </div>
      <span className={`mt-5 rounded-full px-3 py-1 text-xs font-medium ${state.labelBg}`}>
        {state.label}
      </span>
    </div>
  );
}
