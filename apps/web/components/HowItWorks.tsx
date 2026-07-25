import { InfoCard } from "./InfoCard";

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
  return (
    <InfoCard index="04" title="How this works">
      <p className="text-[13.5px] leading-[1.65] text-ink-muted">
        Your browser streams mic audio in 250&nbsp;ms chunks over a single WebSocket to a Node worker, which relays
        it to Deepgram for streaming speech-to-text. Each finalized line fans out to three jobs in parallel: an LLM
        drafts running notes, a pgvector search retrieves the most relevant procedures, and a second LLM scores
        sentiment — the frustration alert time is measured from transcript to score and shown on screen.
      </p>
      <pre className="scroll-thin mt-3.5 overflow-x-auto rounded-[10px] border border-line bg-[#f7f8fd] p-3 font-mono text-[11px] leading-[1.7] text-ink-muted">
{`mic ──ws──▶ worker ──▶ Deepgram (ASR)
                 ├──▶ LLM  ▶ notes
                 ├──▶ pgvector ▶ docs
                 └──▶ LLM  ▶ sentiment ▶ alert
              all results ──ws──▶ browser`}
      </pre>

      <div className="mt-3.5 border-t border-line-2 pt-3">
        <p className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-ink-faint">
          Built with
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {STACK.map((t) => (
            <li
              key={t.name}
              className="inline-flex items-baseline gap-1.5 rounded-[7px] border border-line bg-surface px-2 py-1 text-[11.5px] text-ink-faint"
            >
              <span className="font-semibold text-ink">{t.name}</span>
              <span>· {t.role}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-muted">
          Built with{" "}
          <a
            href="https://claude.com/claude-code"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-ink"
          >
            Claude Code
          </a>
          , Anthropic&rsquo;s agentic coding CLI — pair-programmed end to end (scaffold, pipeline, deploy). A public
          re-build of a real-time agent-assist system I built at Capital One; code on GitHub, full write-up on my
          site.
        </p>
      </div>
    </InfoCard>
  );
}
