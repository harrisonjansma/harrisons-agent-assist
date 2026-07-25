/**
 * Minimal markdown renderer for the notes panel. The notes prompt emits a
 * constrained subset (bold section headers, bullet lists, em-dashes), so a tiny
 * purpose-built renderer avoids a markdown dependency (ADR: keep deps thin).
 *
 * The notes render as instrument sections: each `**Header**` becomes a mono
 * rule-underlined caption, and the lines under it become dotted rows.
 */
import { Fragment, type ReactNode } from "react";

export interface NoteSection {
  title: string;
  items: string[];
}

function renderInline(text: string): ReactNode[] {
  // split on **bold** spans
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

/** `**Header**` starts a section; every other non-blank line is one of its rows. */
export function parseNotes(source: string): NoteSection[] {
  const sections: NoteSection[] = [];
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("**")) {
      sections.push({ title: line.replace(/\*\*/g, "").trim(), items: [] });
    } else if (sections.length) {
      sections[sections.length - 1]!.items.push(line.replace(/^[-*]\s*/, ""));
    }
  }
  return sections;
}

export function NoteSections({ source }: { source: string }) {
  const sections = parseNotes(source);
  return (
    <>
      {sections.map((s, i) => (
        <div key={`${s.title}-${i}`} className="a-rise">
          <div className="border-b border-line-2 pb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.15em] text-ink-faint">
            {s.title}
          </div>
          {s.items.map((it, j) => (
            <div key={j} className="flex gap-2 pt-[7px] text-[13.5px] leading-[1.55] text-ink-2">
              <span aria-hidden className="mt-[7px] h-1 w-1 flex-none rounded-full bg-brand-2" />
              <span>{renderInline(it)}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
