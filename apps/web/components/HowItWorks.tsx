import { useState } from "react";

export function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card text-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-ink"
      >
        How this works
        <span className="grid h-6 w-6 place-items-center rounded-lg border border-[var(--line)] text-ink-muted">
          {open ? "–" : "+"}
        </span>
      </button>
      {open && (
        <div className="animate-rise space-y-3 border-t border-[var(--line)] px-4 py-4 text-ink-muted">
          <p className="leading-relaxed">
            Your browser streams mic audio in 250&nbsp;ms chunks over a single WebSocket to a Node worker, which relays
            it to Deepgram for streaming speech-to-text. Each finalized line fans out to three jobs in parallel: an LLM
            drafts running notes, a pgvector search retrieves the most relevant procedures, and a second LLM scores
            sentiment — the frustration alert time is measured from transcript to score and shown on screen.
          </p>
          <pre className="scroll-thin overflow-x-auto rounded-lg border border-[var(--line)] bg-black/20 p-3 text-xs text-ink-muted">
{`mic ──ws──▶ worker ──▶ Deepgram (ASR)
                 ├──▶ LLM  ▶ notes
                 ├──▶ pgvector ▶ docs
                 └──▶ LLM  ▶ sentiment ▶ alert
              all results ──ws──▶ browser`}
          </pre>
          <p className="text-ink-faint">
            <span className="text-ink-muted">Sample vs. mic:</span> the sample call is a recorded replay
            of one real run of this pipeline — captured once, then played back so it&rsquo;s instant and
            costs nothing to re-watch. Use your microphone for a fully live session where Deepgram and the
            LLMs run in real time.
          </p>
          <p className="text-ink-faint">
            A public re-build of a real-time agent-assist system I built at Capital One. Code on GitHub; full write-up
            on my site.
          </p>
        </div>
      )}
    </div>
  );
}
