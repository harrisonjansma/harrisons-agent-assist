import { useEffect, useRef } from "react";
import type { TranscriptLine } from "../lib/useCopilot";

export function TranscriptPanel({ finals, interim }: { finals: TranscriptLine[]; interim: string }) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);

  // Auto-scroll to bottom unless the user has scrolled up.
  const onScroll = () => {
    const el = wrapRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  useEffect(() => {
    if (pinnedRef.current) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [finals, interim]);

  const empty = finals.length === 0 && !interim;

  return (
    <Panel title="Transcript">
      <div ref={wrapRef} onScroll={onScroll} className="h-full space-y-1 overflow-y-auto pr-1">
        {empty && <Empty>Speak (or play the sample call) and your words appear here live.</Empty>}
        {finals.map((l, i) => (
          <p key={i} className="text-sm text-slate-800">
            {l.text}
          </p>
        ))}
        {interim && <p className="text-sm italic text-slate-400">{interim}</p>}
        <div ref={endRef} />
      </div>
    </Panel>
  );
}

export function Panel({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {right}
      </div>
      <div className="min-h-0 flex-1 p-3">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}
