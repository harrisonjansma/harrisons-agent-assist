import { useState } from "react";

const STACK: { name: string; role: string }[] = [
  { name: "Next.js", role: "web UI" },
  { name: "Node + ws", role: "WebSocket worker" },
  { name: "Deepgram nova-2", role: "streaming speech-to-text" },
  { name: "OpenAI gpt-4o-mini", role: "notes + sentiment" },
  { name: "text-embedding-3-small", role: "RAG embeddings" },
  { name: "Supabase + pgvector", role: "docs store + vector search" },
  { name: "Railway", role: "hosting" },
  { name: "Cloudflare", role: "DNS + TLS" },
];

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

          {/* Stack */}
          <div className="border-t border-[var(--line)] pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
              Built with
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {STACK.map((t) => (
                <li
                  key={t.name}
                  title={t.role}
                  className="inline-flex items-baseline gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-ink-muted"
                >
                  <span className="font-medium text-ink">{t.name}</span>
                  <span className="text-ink-faint">· {t.role}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">
              Built with{" "}
              <a
                href="https://claude.com/claude-code"
                target="_blank"
                rel="noreferrer"
                className="text-ink-muted underline decoration-dotted underline-offset-2 hover:text-ink"
              >
                Claude Code
              </a>
              , Anthropic&rsquo;s agentic coding CLI — pair-programmed end to end (scaffold, pipeline,
              deploy).
            </p>
          </div>

          <p className="text-ink-faint">
            A public re-build of a real-time agent-assist system I built at Capital One. Code on GitHub; full write-up
            on my site.
          </p>
        </div>
      )}
    </div>
  );
}
