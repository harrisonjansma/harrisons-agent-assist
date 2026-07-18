/**
 * Prominent "this is a demo" callout. Two jobs:
 *  1. Make unmistakably clear this is an independent portfolio project — it does
 *     NOT touch Capital One's internal systems, data, or code, and every caller
 *     record is fictional "Acme Support" data.
 *  2. Name the actual tools/stack the demo runs on, since that's what a viewer
 *     evaluating the build wants to know.
 */
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

export function Disclaimer() {
  return (
    <section className="animate-rise overflow-hidden rounded-2xl border border-amber-400/25 bg-amber-400/[0.06]">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:gap-4 sm:p-5">
        <div
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-300"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-amber-100">
            Demo only — not a Capital One system
          </p>
          <p className="text-sm leading-relaxed text-amber-100/75">
            This is an independent portfolio project built by Harrison Jansma. It is{" "}
            <span className="font-semibold text-amber-100">not connected to Capital One</span> and uses
            none of its internal systems, data, models, or code. It is a public re-build of the{" "}
            <span className="whitespace-nowrap">shape</span> of that work. Every transcript, document,
            and caller here is fictional “Acme Support” sample data.
          </p>
        </div>
      </div>

      <div className="border-t border-amber-400/15 bg-black/10 px-4 py-3 sm:px-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100/60">
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
      </div>
    </section>
  );
}
