import type { SentimentLabel } from "@call-copilot/shared/protocol";

const LABEL_COLOR: Record<SentimentLabel, string> = {
  positive: "text-emerald-400",
  neutral: "text-ink-muted",
  negative: "text-amber-400",
  frustrated: "text-red-400",
};

/** Semicircular needle gauge spanning -1 (left) to +1 (right). */
export function SentimentGauge({ score, label }: { score: number; label: SentimentLabel }) {
  const angle = Math.max(-1, Math.min(1, score)) * 90;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 120 70" className="w-24">
        <defs>
          <linearGradient id="sent" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="url(#sent)" strokeWidth="7" strokeLinecap="round" />
        <line
          x1="60"
          y1="60"
          x2="60"
          y2="20"
          stroke="#e6edf6"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${angle} 60 60)`}
          style={{ transition: "transform 400ms cubic-bezier(.2,.8,.2,1)" }}
        />
        <circle cx="60" cy="60" r="3.5" fill="#e6edf6" />
      </svg>
      <div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Sentiment</div>
        <div className={`text-sm font-semibold capitalize ${LABEL_COLOR[label]}`}>{label}</div>
        <div className="text-xs tabular-nums text-ink-faint">{score.toFixed(2)}</div>
      </div>
    </div>
  );
}

export function FrustrationBanner({ latencyMs }: { latencyMs: number }) {
  return (
    <div className="animate-rise flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-500/20 text-red-300" aria-hidden>
        !
      </span>
      <span>
        <strong className="font-semibold text-red-100">Frustration detected</strong> — a supervisor would be pinged
        now. <span className="text-red-300/90">detected in {latencyMs} ms</span>
      </span>
    </div>
  );
}
