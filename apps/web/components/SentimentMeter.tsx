import type { SentimentLabel } from "@call-copilot/shared/protocol";

const LABEL_COLOR: Record<SentimentLabel, string> = {
  positive: "#059669",
  neutral: "var(--ink-muted)",
  negative: "#d97706",
  frustrated: "#dc2626",
};

/**
 * Horizontal sentiment meter spanning -1 (frustrated) to +1 (positive).
 * Replaces the old semicircular needle gauge: it reads as an instrument on the
 * transport row and keeps the score legible at a glance.
 */
export function SentimentMeter({ score, label }: { score: number; label: SentimentLabel }) {
  const clamped = Math.max(-1, Math.min(1, score));
  const markerPct = (((clamped + 1) / 2) * 100).toFixed(1);
  const signed = `${clamped > 0 ? "+" : ""}${clamped.toFixed(2)}`;

  return (
    // wraps rather than overflowing on narrow phones (the three blocks below
    // have min-widths that don't all fit on one line under ~330px)
    <div className="flex flex-[1_1_360px] flex-wrap items-center gap-3.5 mid:min-w-[300px]">
      {/* the gap + min-width keep the two end labels from colliding */}
      <div className="min-w-[150px] flex-[1_1_auto]">
        <div className="flex justify-between gap-2.5 font-mono text-[8.5px] tracking-[0.08em] text-ink-ghost">
          <span>FRUSTRATED</span>
          <span>POSITIVE</span>
        </div>
        <div
          className="relative mt-[5px] h-1.5 rounded-full"
          style={{ backgroundImage: "linear-gradient(90deg,#ef4444,#eab308 50%,#10b981)" }}
          role="meter"
          aria-valuemin={-1}
          aria-valuemax={1}
          aria-valuenow={clamped}
          aria-label="Customer sentiment"
        >
          <span
            className="absolute top-[-4px] h-3.5 w-3.5 rounded-full border-[3px] border-ink bg-white shadow-[0_2px_6px_rgba(23,26,38,0.3)]"
            style={{ left: `calc(${markerPct}% - 7px)`, transition: "left 400ms cubic-bezier(.2,.8,.2,1)" }}
          />
        </div>
      </div>
      <div className="min-w-[88px]">
        <div className="font-mono text-[9.5px] tracking-[0.13em] text-ink-ghost">SENTIMENT</div>
        <div className="text-[13.5px] font-semibold capitalize" style={{ color: LABEL_COLOR[label] }}>
          {label}
        </div>
      </div>
      <div className="min-w-[62px] text-right font-mono text-xl font-bold tabular-nums text-ink">{signed}</div>
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
  latencyMs,
  additionalCount,
}: {
  at: number;
  latencyMs: number;
  additionalCount: number;
}) {
  return (
    <div className="a-rise mb-3.5 flex items-start gap-3 rounded-xl border border-[rgba(220,38,38,0.3)] bg-[#fef2f2] px-3.5 py-[11px]">
      <span
        aria-hidden
        className="a-alert-glow mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[#fee2e2] text-[13px] font-bold text-[#dc2626]"
      >
        !
      </span>
      <div className="min-w-0 text-[13.5px] text-[#991b1b]">
        <div>
          <strong className="font-semibold text-[#7f1d1d]">Frustration detected</strong> — supervisor pinged at{" "}
          <span className="font-mono text-[#7f1d1d]">{fmtTime(at)}</span> ·{" "}
          <span className="font-mono text-[#dc2626]">{latencyMs} ms transcript→score</span>
        </div>
        {additionalCount > 0 && (
          <div className="mt-[3px] text-xs text-[#dc2626]">
            +{additionalCount} additional sentiment alert{additionalCount > 1 ? "s" : ""} received — logged, not
            re-paged (supervisor already engaged).
          </div>
        )}
      </div>
    </div>
  );
}
