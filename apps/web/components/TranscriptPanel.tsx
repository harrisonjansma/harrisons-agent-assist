import { useEffect, useRef } from "react";
import type { Speaker } from "@call-copilot/shared/protocol";
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

/** One transcript line. With a speaker it's a chat bubble; without (mic), a plain line. */
function Line({ text, speaker, interim }: { text: string; speaker?: Speaker | null; interim?: boolean }) {
  if (!speaker) {
    return (
      <p className={`animate-rise text-[15px] leading-relaxed ${interim ? "italic text-ink-faint" : "text-ink"}`}>
        {text}
      </p>
    );
  }
  const isAgent = speaker === "agent";
  return (
    <div className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
      <div
        className={`animate-rise max-w-[88%] rounded-2xl px-3 py-2 ${
          isAgent
            ? "rounded-tr-sm border border-[var(--line)] bg-[var(--surface-strong)]"
            : "rounded-tl-sm border border-[var(--brand)]/25 bg-[var(--brand)]/[0.10]"
        } ${interim ? "opacity-70" : ""}`}
      >
        <div
          className={`mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
            isAgent ? "text-ink-faint" : "text-brand-ink"
          }`}
        >
          {isAgent ? "Agent" : "Customer"}
        </div>
        <p className={`text-[14px] leading-relaxed ${isAgent ? "text-ink-muted" : "text-ink"} ${interim ? "italic" : ""}`}>
          {text}
        </p>
      </div>
    </div>
  );
}

export function TranscriptPanel({
  finals,
  interim,
  interimSpeaker,
}: {
  finals: TranscriptLine[];
  interim: string;
  interimSpeaker?: Speaker | null;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);

  const onScroll = () => {
    const el = wrapRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  useEffect(() => {
    // Keep the newest line in view by scrolling ONLY the transcript box — never
    // the page. Element.scrollIntoView() bubbles up and scrolls every scrollable
    // ancestor, including the window, so on mobile each incoming utterance yanked
    // the whole page back to the transcript while you were reading further down.
    // Setting scrollTop on the inner list is self-contained and moves nothing else.
    const el = wrapRef.current;
    if (el && pinnedRef.current && (finals.length || interim)) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [finals, interim]);

  const empty = finals.length === 0 && !interim;

  return (
    <Panel title="Transcript" accent="#4f46e5">
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
          <Line key={i} text={l.text} speaker={l.speaker} />
        ))}
        {interim && <Line text={interim} speaker={interimSpeaker} interim />}
      </div>
    </Panel>
  );
}
