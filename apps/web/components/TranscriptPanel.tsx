import { useEffect, useRef } from "react";
import type { TranscriptLine } from "../lib/useCopilot";

export function Panel({
  title,
  children,
  right,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  accent?: string;
}) {
  return (
    <section className="card flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent ?? "var(--brand)" }} />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{title}</h2>
        </div>
        {right}
      </div>
      <div className="min-h-0 flex-1 p-4">{children}</div>
    </section>
  );
}

export function Empty({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      {icon && <div className="text-ink-faint opacity-70">{icon}</div>}
      <p className="max-w-[15rem] text-sm leading-relaxed text-ink-faint">{children}</p>
    </div>
  );
}

export function TranscriptPanel({ finals, interim }: { finals: TranscriptLine[]; interim: string }) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);

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
    <Panel title="Transcript" accent="#4f8cff">
      <div ref={wrapRef} onScroll={onScroll} className="scroll-thin h-full space-y-2 overflow-y-auto pr-1">
        {empty && (
          <Empty
            icon={
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
              </svg>
            }
          >
            Speak — or play the sample call — and your words stream in here live.
          </Empty>
        )}
        {finals.map((l, i) => (
          <p key={i} className="animate-rise text-[15px] leading-relaxed text-ink">
            {l.text}
          </p>
        ))}
        {interim && <p className="text-[15px] italic leading-relaxed text-ink-faint">{interim}</p>}
        <div ref={endRef} />
      </div>
    </Panel>
  );
}
