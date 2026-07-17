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
    <span className="flex items-center gap-1 text-xs text-slate-400">
      <span className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-500" />
      drafting…
    </span>
  ) : null;

  return (
    <Panel title="Call notes" right={spinner}>
      <div className={`h-full overflow-y-auto rounded ${flash ? "animate-flash" : ""}`}>
        {notes ? <Markdown source={notes} /> : <Empty>Notes draft themselves as the conversation unfolds.</Empty>}
      </div>
    </Panel>
  );
}
