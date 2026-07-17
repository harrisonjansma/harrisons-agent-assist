import type { ConnState } from "../lib/useCopilot";

function fmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const DOT: Record<ConnState, string> = {
  idle: "bg-slate-300",
  connecting: "bg-amber-400 animate-pulse",
  live: "bg-green-500",
  ended: "bg-slate-400",
  error: "bg-red-500",
};

const LABEL: Record<ConnState, string> = {
  idle: "not connected",
  connecting: "connecting…",
  live: "connected",
  ended: "ended",
  error: "error",
};

export function StatusBar(props: {
  conn: ConnState;
  remainingMs: number;
  asrLatencyMs: number | null;
  sentimentP50Ms: number | null;
}) {
  const { conn, remainingMs, asrLatencyMs, sentimentP50Ms } = props;
  const showTimer = conn === "live";
  const nearEnd = remainingMs <= 30_000;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${DOT[conn]}`} />
        {LABEL[conn]}
      </span>
      {showTimer && (
        <span className={nearEnd ? "font-semibold text-red-600" : ""}>
          {fmt(remainingMs)} left
        </span>
      )}
      <span>ASR latency: {asrLatencyMs != null ? `${asrLatencyMs} ms` : "—"}</span>
      <span>sentiment p50: {sentimentP50Ms != null ? `${sentimentP50Ms} ms` : "—"}</span>
    </div>
  );
}
