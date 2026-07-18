/**
 * Minimal markdown renderer for the notes panel. The notes prompt emits a
 * constrained subset (bold section headers, bullet lists, em-dashes), so a tiny
 * purpose-built renderer avoids a markdown dependency (ADR: keep deps thin).
 */
import { Fragment, type ReactNode } from "react";

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

export function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const out: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (bullets.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="ml-4 list-disc space-y-0.5">
          {bullets.map((b, i) => (
            <li key={i}>{renderInline(b)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]!);
      continue;
    }
    flush();
    out.push(
      <p key={`p-${out.length}`} className="mt-2">
        {renderInline(line)}
      </p>,
    );
  }
  flush();
  return <div className="animate-rise text-sm leading-relaxed text-ink-muted [&_strong]:text-ink">{out}</div>;
}
