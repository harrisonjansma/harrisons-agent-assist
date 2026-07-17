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
      className="w-full rounded-md border border-slate-200 p-2 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-800">{doc.title}</span>
        <span className="shrink-0 text-[10px] tabular-nums text-slate-400">{doc.score.toFixed(2)}</span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded bg-slate-100">
        <div className="h-full bg-blue-400" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {open ? (loading ? "loading…" : body) : `${doc.snippet}…`}
      </p>
    </button>
  );
}

export function DocsPanel({ docs }: { docs: DocHit[] }) {
  return (
    <Panel title="Procedure docs (RAG)">
      <div className="h-full space-y-2 overflow-y-auto pr-1">
        {docs.length === 0 ? (
          <Empty>Relevant support procedures surface here as topics come up.</Empty>
        ) : (
          docs.map((d) => <DocCard key={d.id} doc={d} />)
        )}
      </div>
    </Panel>
  );
}
