import { NoteSections } from "../lib/markdown";
import { Panel, PanelBody, Empty } from "./TranscriptPanel";

export function NotesPanel({ notes, rev, drafting }: { notes: string; rev: number; drafting: boolean }) {
  // The rev counter replaces the old "drafting" spinner; the dot still pulses
  // while a redraft is actually in flight.
  const meta = (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-brand-ink">
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full bg-brand-2 ${drafting ? "a-pulse" : ""}`} />
      rev {String(rev).padStart(2, "0")}
    </span>
  );

  return (
    <Panel index="02" title="Call notes" meta={meta}>
      <PanelBody className="gap-3.5">
        {notes ? (
          <NoteSections source={notes} />
        ) : (
          <Empty
            icon={
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2z" strokeLinejoin="round" />
                <path d="M9 9h6M9 13h4" strokeLinecap="round" />
              </svg>
            }
          >
            Notes draft themselves — reason, key details, actions, follow-ups — as the call unfolds.
          </Empty>
        )}
      </PanelBody>
    </Panel>
  );
}
