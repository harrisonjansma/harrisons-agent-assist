import { useState } from "react";
import type { DocHit } from "@call-copilot/shared/protocol";
import { Panel, Empty } from "./TranscriptPanel";

function DocCard({ doc }: { doc: DocHit }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && body == null) {
      setLoading(true);
      try {
        const res = await fetch(`/api/docs/${doc.id}`);
        const json = await res.json();
        setBody(json.body ?? "(unavailable)");
      } catch {
        setBody("(failed to load)");
      } finally {
        setLoading(false);
      }
    }
  };

  const pct = Math.round(doc.score * 100);
  return (
    <button
      onClick={toggle}
      className="animate-rise w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-left transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-strong)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">{doc.title}</span>
        <span className="shrink-0 rounded-md bg-[var(--brand)]/10 px-1.5 py-0.5 text-[10px] tabular-nums text-brand-ink">
          {doc.score.toFixed(2)}
        </span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/[0.07]">
        <div className="brand-gradient h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-faint [&]:line-clamp-4">
        {open ? (loading ? "loading…" : body) : `${doc.snippet}…`}
      </p>
    </button>
  );
}

export function DocsPanel({ docs }: { docs: DocHit[] }) {
  return (
    <Panel title="Procedure docs · RAG" accent="#34d399">
      <div className="scroll-thin h-full space-y-2 overflow-y-auto pr-1">
        {docs.length === 0 ? (
          <Empty
            icon={
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" strokeLinejoin="round" />
                <path d="M13 3v5h5M8 13h8M8 17h5" strokeLinecap="round" />
              </svg>
            }
          >
            Relevant support procedures are retrieved and surface here as topics come up.
          </Empty>
        ) : (
          docs.map((d) => <DocCard key={d.id} doc={d} />)
        )}
      </div>
    </Panel>
  );
}
