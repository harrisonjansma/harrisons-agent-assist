import { useEffect, useRef } from "react";
import type { Speaker } from "@call-copilot/shared/protocol";
import type { TranscriptLine } from "../lib/useCopilot";

/** m:ss from the start of the call. */
export function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Instrument panel: mono index + title on the left, live meta on the right. */
export function Panel({
  index,
  title,
  meta,
  children,
}: {
  index: string;
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line-2 px-3.5 py-[11px]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-[10px] tracking-[0.16em] text-ink-ghost">{index}</span>
          <h2 className="font-display text-xs font-semibold uppercase tracking-[0.13em] text-ink">{title}</h2>
        </div>
        {meta}
      </div>
      {children}
    </section>
  );
}

/** Shared scrolling body for the three panels. */
export function PanelBody({
  children,
  scrollRef,
  onScroll,
  className = "",
}: {
  children: React.ReactNode;
  scrollRef?: React.RefObject<HTMLDivElement>;
  onScroll?: () => void;
  className?: string;
}) {
  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className={`scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto p-3.5 ${className}`}
    >
      {children}
    </div>
  );
}

export function Empty({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      {icon && <div className="text-ink-ghost">{icon}</div>}
      <p className="max-w-[15rem] text-[13px] leading-relaxed text-ink-faint">{children}</p>
    </div>
  );
}

/** One transcript line. With a speaker it's a chat bubble; without (mic), a plain line. */
function Line({
  text,
  speaker,
  atMs,
  interim,
}: {
  text: string;
  speaker?: Speaker | null;
  atMs: number;
  interim?: boolean;
}) {
  if (!speaker) {
    return (
      <p
        className={`a-rise text-[13.5px] leading-[1.6] ${
          interim ? "italic text-ink-muted opacity-[0.62]" : "text-ink"
        }`}
      >
        {text}
      </p>
    );
  }
  const isAgent = speaker === "agent";
  return (
    <div className={`a-rise flex ${isAgent ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-[14px] border px-3 py-2 ${
          isAgent ? "border-line-3 bg-surface-strong" : "border-[rgba(79,70,229,0.28)] bg-[rgba(79,70,229,0.075)]"
        } ${interim ? "opacity-[0.62]" : ""}`}
      >
        <div className="mb-[3px] flex items-baseline gap-[7px]">
          <span
            className={`font-mono text-[9px] font-bold tracking-[0.14em] ${
              isAgent ? "text-ink-faint" : "text-brand-ink"
            }`}
          >
            {isAgent ? "AGENT" : "CUSTOMER"}
          </span>
          <span className="font-mono text-[9px] text-[#b3b8ca]">{fmtElapsed(atMs)}</span>
        </div>
        <p
          className={`text-[13.5px] leading-[1.6] ${isAgent ? "text-ink-muted" : "text-ink"} ${
            interim ? "italic" : ""
          }`}
        >
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
  interimAtMs,
}: {
  finals: TranscriptLine[];
  interim: string;
  interimSpeaker?: Speaker | null;
  interimAtMs: number;
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
    <Panel
      index="01"
      title="Transcript"
      meta={<span className="font-mono text-[10px] text-ink-faint">diarized · 2 speakers</span>}
    >
      <PanelBody scrollRef={wrapRef} onScroll={onScroll} className="gap-[9px]">
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
          <Line key={i} text={l.text} speaker={l.speaker} atMs={l.atMs} />
        ))}
        {interim && <Line text={interim} speaker={interimSpeaker} atMs={interimAtMs} interim />}
      </PanelBody>
    </Panel>
  );
}
