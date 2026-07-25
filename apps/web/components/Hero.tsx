import type { ConnState, Mode } from "../lib/useCopilot";
import { Controls } from "./Controls";

/** Measured on the recorded run; the live numbers replace these once they arrive. */
const FALLBACK_ASR_MS = 88;
const FALLBACK_ALERT_P50_MS = 730;

function Stat({ value, unit, caption }: { value: string; unit: string; caption: string }) {
  return (
    <div className="bg-surface-soft px-4 py-3.5">
      <div className="font-mono text-2xl font-bold tracking-[-0.02em] text-ink">
        {value}
        <span className="text-[13px] font-medium text-ink-faint"> {unit}</span>
      </div>
      <div className="mt-[3px] font-mono text-[9.5px] uppercase tracking-[0.13em] text-ink-faint">{caption}</div>
    </div>
  );
}

function Chip({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-md border border-line bg-surface px-[7px] py-[3px] font-mono text-[9.5px] tracking-[0.14em] text-ink-muted"
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * The reactor: concentric rings + a live waveform core, standing in for the
 * audio stream. Pure CSS — rings, sweep and bars, no SVG, all gated behind
 * prefers-reduced-motion (see globals.css).
 */
function Reactor() {
  return (
    <div className="relative grid h-[340px] w-[340px] place-items-center">
      <div
        className="a-sweep absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(79,70,229,0) 62%, rgba(79,70,229,.28) 88%, rgba(124,58,237,.05))",
          WebkitMaskImage: "radial-gradient(circle, transparent 52%, #000 54%)",
          maskImage: "radial-gradient(circle, transparent 52%, #000 54%)",
        }}
      />
      <div className="absolute inset-0 rounded-full border border-[rgba(79,70,229,0.2)]" />
      <div className="a-ring absolute inset-[26px] rounded-full border border-dashed border-[rgba(79,70,229,0.32)]" />
      <div className="a-ring-rev absolute inset-[62px] rounded-full border border-dotted border-[rgba(124,58,237,0.4)]" />
      <div className="absolute inset-[92px] rounded-full border border-[rgba(23,26,38,0.07)] bg-white/55" />
      <div
        className="relative flex h-[132px] w-[132px] items-center justify-center gap-1 rounded-full"
        style={{
          backgroundImage: "linear-gradient(140deg,#4f46e5,#7c3aed)",
          boxShadow: "0 0 0 8px rgba(79,70,229,.09), 0 22px 60px -18px rgba(79,70,229,.95)",
        }}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            className="a-wave block h-14 w-1 rounded-[3px] bg-white/90"
            style={{ animationDelay: `${(i * 0.09).toFixed(2)}s` }}
          />
        ))}
      </div>
      <Chip style={{ top: 8, left: "50%", transform: "translateX(-50%)" }}>ASR · nova-2</Chip>
      <Chip style={{ right: -6, top: "44%" }}>RAG · pgvector</Chip>
      <Chip style={{ bottom: 26, left: "50%", transform: "translateX(-50%)" }}>NOTES · gpt-4o-mini</Chip>
      <Chip style={{ left: -6, top: "44%", color: "#dc2626", borderColor: "rgba(220,38,38,.28)" }}>
        ALERT · &lt;1s
      </Chip>
    </div>
  );
}

export function Hero(props: {
  conn: ConnState;
  mode: Mode | null;
  asrLatencyMs: number | null;
  sentimentP50Ms: number | null;
  onMic: () => void;
  onSample: () => void;
  onStop: () => void;
}) {
  const { conn, mode, asrLatencyMs, sentimentP50Ms, onMic, onSample, onStop } = props;

  return (
    <section className="grid grid-cols-1 items-center gap-7 px-1 pb-3.5 pt-6 wide:grid-cols-[1.12fr_0.88fr]">
      <div className="min-w-0">
        <p className="flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-brand-ink">
          <span aria-hidden className="a-pulse-fast h-[7px] w-[7px] rounded-full bg-brand" />
          Real-time agent assist
        </p>
        <h1 className="mt-3.5 font-display text-[40px] font-bold leading-[0.98] tracking-[-0.035em] [text-wrap:balance] mid:text-[52px] wide:text-[66px]">
          Four AI jobs
          <br />
          <span className="headline-text">per spoken sentence.</span>
        </h1>
        <p className="mt-5 max-w-[37rem] text-[16.5px] leading-[1.6] text-ink-muted [text-wrap:pretty]">
          Speech in, four things out — a streaming transcript, self-drafting call notes, procedure docs pulled by
          vector search, and a sentiment score that pages a supervisor in under a second. One WebSocket carries all
          of it; nothing polls.
        </p>
        <div className="mt-6">
          <Controls conn={conn} mode={mode} onMic={onMic} onSample={onSample} onStop={onStop} />
        </div>
        {/* Hairline strip: the 1px gap over a --line background IS the divider. */}
        <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line mid:grid-cols-3">
          <Stat value={String(asrLatencyMs ?? FALLBACK_ASR_MS)} unit="ms" caption="ASR partial latency" />
          <Stat
            value={String(sentimentP50Ms ?? FALLBACK_ALERT_P50_MS)}
            unit="ms"
            caption="transcript → alert p50"
          />
          <Stat value="1" unit="socket" caption="uplink audio + downlink JSON" />
        </div>
      </div>

      {/* Decorative — dropped entirely on small screens rather than shrunk. */}
      <div aria-hidden className="hidden min-h-[360px] place-items-center mid:grid">
        <Reactor />
      </div>
    </section>
  );
}
