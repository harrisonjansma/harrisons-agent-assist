import { useEffect, useRef, useState } from "react";
import { Markdown } from "../lib/markdown";
import { Panel, Empty } from "./TranscriptPanel";

export function NotesPanel({ notes, drafting }: { notes: string; drafting: boolean }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(notes);

  useEffect(() => {
    if (notes && notes !== prev.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1000);
      prev.current = notes;
      return () => clearTimeout(t);
    }
    prev.current = notes;
  }, [notes]);

  const spinner = drafting ? (
    <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand-ink">
      <span className="h-1.5 w-1.5 animate-pulse2 rounded-full bg-brand" />
      drafting
    </span>
  ) : null;

  return (
    <Panel title="Call notes" accent="#7c6cff" right={spinner}>
      <div className={`scroll-thin h-full overflow-y-auto rounded-lg ${flash ? "animate-flash" : ""}`}>
        {notes ? (
          <Markdown source={notes} />
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
      </div>
    </Panel>
  );
}
