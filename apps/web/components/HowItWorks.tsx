import { useState } from "react";

export function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 bg-white text-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-slate-700"
      >
        How this works
        <span className="text-slate-400">{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3 text-slate-600">
          <p>
            Your browser streams mic audio in 250&nbsp;ms chunks over a single WebSocket to a Node worker,
            which relays it to Deepgram for streaming speech-to-text. Each finalized line is fanned out to
            three jobs in parallel: an LLM drafts running call notes, a pgvector search retrieves the most
            relevant support procedures, and a second LLM scores sentiment — the frustration alert is the
            time from transcript to score, shown on screen.
          </p>
          <pre className="overflow-x-auto rounded bg-slate-50 p-3 text-xs text-slate-600">
{`mic ──ws──▶ worker ──▶ Deepgram (ASR)
                 ├──▶ LLM  ▶ notes
                 ├──▶ pgvector ▶ docs
                 └──▶ LLM  ▶ sentiment ▶ alert
              all results ──ws──▶ browser`}
          </pre>
          <p className="text-slate-500">
            This is a public re-build of a real-time agent-assist system I built at Capital One. Code is on
            GitHub; a full write-up is on my site.
          </p>
        </div>
      )}
    </div>
  );
}
