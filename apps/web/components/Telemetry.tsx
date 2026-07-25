/**
 * Pipeline telemetry: makes the parallel fan-out (ASR → notes / RAG / sentiment)
 * literally visible, with counters fed from the same live state as the panels.
 */

function Node({
  kicker,
  title,
  sub,
  tint,
}: {
  kicker: string;
  title: string;
  sub: string;
  tint?: boolean;
}) {
  return (
    <div
      className={`flex-none rounded-[11px] border px-3 py-2.5 ${
        tint ? "border-[rgba(79,70,229,0.28)] bg-[rgba(79,70,229,0.05)]" : "border-line bg-surface"
      }`}
    >
      <div className={`font-mono text-[10px] tracking-[0.12em] ${tint ? "text-brand-ink" : "text-ink-faint"}`}>
        {kicker}
      </div>
      <div className="mt-1 text-[13px] font-semibold text-ink">{title}</div>
      <div className="font-mono text-[10.5px] text-ink-muted">{sub}</div>
    </div>
  );
}

/** A 56px hairline carrying a travelling packet dot. */
function Link({ delay }: { delay?: string }) {
  return (
    <div
      aria-hidden
      className="relative hidden h-px w-14 flex-none mid:block"
      style={{ background: "linear-gradient(90deg,#d3d7e8,#c3c8e0)" }}
    >
      <span
        className="a-flow absolute left-0 top-[-2.5px] h-1.5 w-1.5 rounded-full bg-brand"
        style={{ ["--d" as string]: "50px", animationDelay: delay }}
      />
    </div>
  );
}

function Branch({
  color,
  label,
  meta,
  value,
}: {
  color: string;
  label: string;
  meta: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-surface px-3 py-[7px]">
      <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-ink">
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
        {label}
        <span className="font-mono text-[10.5px] font-normal text-ink-faint">{meta}</span>
      </span>
      <span className="shrink-0 font-mono text-[11px] text-ink-muted">{value}</span>
    </div>
  );
}

export function Telemetry(props: {
  asrLatencyMs: number | null;
  notesRev: number;
  docHits: number;
  sentimentLatencyMs: number | null;
}) {
  const { asrLatencyMs, notesRev, docHits, sentimentLatencyMs } = props;

  return (
    <section className="rounded-2xl border border-line bg-surface-soft px-[18px] py-4 shadow-[var(--shadow-sm)]">
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-[10px] tracking-[0.16em] text-ink-ghost">00</span>
          <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.1em] text-ink">
            Pipeline telemetry
          </h2>
        </div>
        <span className="font-mono text-[10.5px] text-ink-faint">
          each finalized utterance fans out to 3 jobs in parallel
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-0 gap-y-3.5">
        <Node kicker="AUDIO IN" title="webm/opus" sub="250 ms chunks" />
        <Link />
        <Node kicker="NODE WORKER" title="ws relay" sub="1 socket / session" tint />
        <Link delay="0.35s" />
        <Node kicker="DEEPGRAM" title="nova-2 ASR" sub={`${asrLatencyMs ?? "—"} ms partial`} />

        {/* the fan-out: one hairline per parallel job */}
        <div aria-hidden className="hidden w-[54px] flex-none flex-col gap-[26px] px-0.5 mid:flex">
          {[
            { c: "#7c3aed", d: undefined },
            { c: "#10b981", d: "0.25s" },
            { c: "#dc2626", d: "0.5s" },
          ].map((b) => (
            <div key={b.c} className="relative h-px bg-[#c3c8e0]">
              <span
                className="a-flow-fan absolute left-0 top-[-2.5px] h-1.5 w-1.5 rounded-full"
                style={{ background: b.c, ["--d" as string]: "48px", animationDelay: b.d }}
              />
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2">
          <Branch
            color="#7c3aed"
            label="Notes draft"
            meta="gpt-4o-mini · debounced"
            value={`rev ${String(notesRev).padStart(2, "0")}`}
          />
          <Branch color="#10b981" label="Vector search" meta="match_docs · cosine ≥ .28" value={`${docHits} hits`} />
          <Branch
            color="#dc2626"
            label="Sentiment"
            meta="score → supervisor page"
            value={`${sentimentLatencyMs ?? "—"} ms`}
          />
        </div>
      </div>
    </section>
  );
}
