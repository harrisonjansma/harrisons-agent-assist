import type { SentimentLabel } from "@call-copilot/shared/protocol";

const LABEL_COLOR: Record<SentimentLabel, string> = {
  positive: "text-green-600",
  neutral: "text-slate-500",
  negative: "text-orange-600",
  frustrated: "text-red-600",
};

/** Semicircular needle gauge spanning -1 (left) to +1 (right). */
export function SentimentGauge({ score, label }: { score: number; label: SentimentLabel }) {
  // map score [-1,1] to angle [-90,90] degrees
  const angle = Math.max(-1, Math.min(1, score)) * 90;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 66" className="w-40">
        <defs>
          <linearGradient id="sent" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="url(#sent)" strokeWidth="8" strokeLinecap="round" />
        <line
          x1="60"
          y1="60"
          x2="60"
          y2="18"
          stroke="#0f172a"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${angle} 60 60)`}
          style={{ transition: "transform 400ms ease-out" }}
        />
        <circle cx="60" cy="60" r="3.5" fill="#0f172a" />
      </svg>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-sm font-semibold capitalize ${LABEL_COLOR[label]}`}>{label}</span>
        <span className="text-xs tabular-nums text-slate-400">{score.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function FrustrationBanner({ latencyMs }: { latencyMs: number }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      <span aria-hidden>⚠</span>
      <span>
        <strong>Frustration detected</strong> — a supervisor would be pinged now.{" "}
        <span className="text-red-500">detected in {latencyMs} ms</span>
      </span>
    </div>
  );
}
