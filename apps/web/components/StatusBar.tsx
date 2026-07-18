import type { ConnState } from "../lib/useCopilot";

function fmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const DOT: Record<ConnState, string> = {
  idle: "bg-ink-faint",
  connecting: "bg-amber-400 animate-pulse2",
  live: "bg-emerald-400 animate-pulse2",
  ended: "bg-ink-faint",
  error: "bg-red-400",
};
const LABEL: Record<ConnState, string> = {
  idle: "not connected",
  connecting: "connecting",
  live: "live",
  ended: "ended",
  error: "error",
};

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-ink-faint">{label}</span>
      <span className={`tabular-nums ${warn ? "font-semibold text-red-300" : "text-ink-muted"}`}>{value}</span>
    </span>
  );
}

export function StatusBar(props: {
  conn: ConnState;
  remainingMs: number;
  asrLatencyMs: number | null;
  sentimentP50Ms: number | null;
}) {
  const { conn, remainingMs, asrLatencyMs, sentimentP50Ms } = props;
  const nearEnd = remainingMs <= 30_000;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 font-medium text-ink-muted">
        <span className={`h-2 w-2 rounded-full ${DOT[conn]}`} />
        {LABEL[conn]}
      </span>
      {conn === "live" && <Stat label="time left" value={fmt(remainingMs)} warn={nearEnd} />}
      <Stat label="ASR latency" value={asrLatencyMs != null ? `${asrLatencyMs} ms` : "—"} />
      <Stat label="sentiment p50" value={sentimentP50Ms != null ? `${sentimentP50Ms} ms` : "—"} />
    </div>
  );
}
