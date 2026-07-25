import { useState } from "react";
import type { DocHit } from "@call-copilot/shared/protocol";
import { Panel, PanelBody, Empty } from "./TranscriptPanel";

function DocCard({ doc }: { doc: DocHit }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && body == null) {
      // Sample replay ships the body inline (self-contained, no DB call);
      // live mic mode fetches it by id.
      if (doc.body != null) {
        setBody(doc.body);
        return;
      }
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
      aria-expanded={open}
      className="a-rise w-full rounded-xl border border-line-3 bg-surface px-3 py-[11px] text-left transition hover:border-[#cfd4e8] hover:bg-[#fbfbff]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold leading-[1.35] text-ink">{doc.title}</span>
        <span className="flex-none rounded-md bg-[rgba(79,70,229,0.09)] px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-brand-ink">
          {doc.score.toFixed(2)}
        </span>
      </div>
      <div className="mt-[9px] h-[3px] w-full overflow-hidden rounded-full bg-line-2">
        <div
          className="brand-gradient h-full rounded-full"
          style={{ width: `${pct}%`, transition: "width 500ms ease" }}
        />
      </div>
      {/* Collapsed, the snippet's own line breaks would eat the 3-line clamp;
          expanded, the doc body needs them. */}
      <p
        className={`mt-[9px] text-xs leading-[1.55] text-ink-faint ${
          open ? "whitespace-pre-line" : "line-clamp-3"
        }`}
      >
        {open ? (loading ? "loading…" : body) : `${doc.snippet}…`}
      </p>
    </button>
  );
}

export function DocsPanel({ docs }: { docs: DocHit[] }) {
  return (
    <Panel
      index="03"
      title="Procedure docs · RAG"
      meta={<span className="font-mono text-[10px] text-ink-faint">top {docs.length}</span>}
    >
      <PanelBody className="gap-[9px]">
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
      </PanelBody>
    </Panel>
  );
}
