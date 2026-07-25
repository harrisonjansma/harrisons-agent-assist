import type { SentimentLabel } from "@call-copilot/shared/protocol";
import type { ConnState, Mode } from "../lib/useCopilot";
import { SentimentMeter } from "./SentimentMeter";
import { fmtElapsed } from "./TranscriptPanel";

/** One row of instruments above the panels: state, transport, clock, sentiment. */
export function TransportRow(props: {
  conn: ConnState;
  mode: Mode | null;
  paused: boolean;
  elapsedMs: number;
  durationMs: number;
  remainingMs: number;
  sentimentScore: number;
  sentimentLabel: SentimentLabel;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
}) {
  const {
    conn,
    mode,
    paused,
    elapsedMs,
    durationMs,
    remainingMs,
    sentimentScore,
    sentimentLabel,
    onPause,
    onResume,
    onRestart,
  } = props;

  const live = conn === "live";
  const sample = mode === "sample";
  const status = !live
    ? { text: conn === "connecting" ? "CONNECTING" : "IDLE", color: "var(--ink-faint)", tinted: false }
    : paused
      ? { text: "PAUSED", color: "var(--ink-faint)", tinted: false }
      : { text: sample ? "LIVE · SAMPLE REPLAY" : "LIVE · MICROPHONE", color: "#047857", tinted: true };

  // The transport drives the cached replay only; in mic mode Stop is the control.
  const transport =
    sample && (live || conn === "ended")
      ? conn === "ended"
        ? { label: "↻ REPLAY", onClick: onRestart }
        : paused
          ? { label: "▶ RESUME", onClick: onResume }
          : { label: "❙❙ PAUSE", onClick: onPause }
      : null;

  const pct = durationMs > 0 ? Math.min(100, (elapsedMs / durationMs) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-[18px] gap-y-3 px-1 pb-3.5 pt-0.5">
      <span
        className="inline-flex items-center gap-[7px] rounded-full border px-[11px] py-[5px] font-mono text-[10.5px] tracking-[0.12em]"
        style={{
          borderColor: status.tinted ? "rgba(16,185,129,.35)" : "var(--line)",
          background: status.tinted ? "rgba(16,185,129,.08)" : "var(--surface)",
          color: status.color,
        }}
      >
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${status.tinted ? "a-pulse" : ""}`}
          style={{ background: status.tinted ? "#10b981" : "var(--ink-ghost)" }}
        />
        {status.text}
      </span>

      {transport && (
        <button
          onClick={transport.onClick}
          className="rounded-lg border border-line-strong bg-surface px-[11px] py-[5px] font-mono text-[11.5px] font-medium tracking-[0.08em] text-ink-muted transition hover:border-[rgba(79,70,229,0.5)] hover:text-ink"
        >
          {transport.label}
        </button>
      )}

      {/* Call progress — the replay's position, or the mic session's countdown.
          Nothing to show before a call has started. */}
      {mode && (
        <div className="flex min-w-[200px] flex-1 items-center gap-2.5">
          <span className="font-mono text-[11px] tabular-nums text-ink-muted">
            {sample ? fmtElapsed(elapsedMs) : fmtElapsed(remainingMs)}
          </span>
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line">
            <div className="brand-gradient h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-mono text-[11px] tabular-nums text-ink-faint">
            {sample ? fmtElapsed(durationMs) : "left"}
          </span>
        </div>
      )}

      <SentimentMeter score={sentimentScore} label={sentimentLabel} />
    </div>
  );
}
