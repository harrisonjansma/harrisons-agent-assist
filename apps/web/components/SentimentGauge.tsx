import type { SentimentLabel } from "@call-copilot/shared/protocol";

const LABEL_COLOR: Record<SentimentLabel, string> = {
  positive: "text-emerald-600",
  neutral: "text-ink-muted",
  negative: "text-amber-600",
  frustrated: "text-red-600",
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
          stroke="#171a26"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${angle} 60 60)`}
          style={{ transition: "transform 400ms cubic-bezier(.2,.8,.2,1)" }}
        />
        <circle cx="60" cy="60" r="3.5" fill="#171a26" />
      </svg>
      <div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Sentiment</div>
        <div className={`text-sm font-semibold capitalize ${LABEL_COLOR[label]}`}>{label}</div>
        <div className="text-xs tabular-nums text-ink-faint">{score.toFixed(2)}</div>
      </div>
    </div>
  );
}

function fmtTime(at: number): string {
  try {
    return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

export function FrustrationBanner({
  at,
  p50Ms,
  additionalCount,
}: {
  at: number;
  p50Ms: number | null;
  additionalCount: number;
}) {
  return (
    <div className="animate-rise flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-100 text-red-600" aria-hidden>
        !
      </span>
      <div className="min-w-0">
        <div>
          <strong className="font-semibold text-red-900">Frustration detected</strong> — supervisor pinged at{" "}
          <span className="tabular-nums text-red-900">{fmtTime(at)}</span>
          {p50Ms != null && (
            <>
              {" "}
              · <span className="text-red-600">~{p50Ms} ms median transcript→score</span>
            </>
          )}
        </div>
        {additionalCount > 0 && (
          <div className="mt-1 text-xs text-red-600">
            +{additionalCount} additional sentiment alert{additionalCount > 1 ? "s" : ""} received — logged, not
            re-paged (supervisor already engaged).
          </div>
        )}
      </div>
    </div>
  );
}
