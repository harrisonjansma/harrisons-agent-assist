import { useEffect, useState } from "react";
import type { ConnState, Mode } from "../lib/useCopilot";

// Once per page load: the sample button rainbow-glows briefly to draw the eye,
// then settles into a normal button so it doesn't get annoying.
let hasGlowed = false;

export function Controls(props: {
  conn: ConnState;
  mode: Mode | null;
  onMic: () => void;
  onSample: () => void;
  onStop: () => void;
}) {
  const { conn, mode, onMic, onSample, onStop } = props;
  const live = conn === "live" || conn === "connecting";

  const [glow, setGlow] = useState(!hasGlowed);
  useEffect(() => {
    if (hasGlowed) return;
    hasGlowed = true;
    const t = setTimeout(() => setGlow(false), 5200);
    return () => clearTimeout(t);
  }, []);

  if (live) {
    return (
      <div className="flex flex-wrap items-center gap-3.5">
        <button
          onClick={onStop}
          className="inline-flex items-center gap-2.5 rounded-xl border border-line-strong bg-surface px-5 py-3 text-[14.5px] font-semibold text-ink transition hover:border-[rgba(79,70,229,0.5)]"
        >
          <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-red-500" />
          Stop
        </button>
        <span className="font-mono text-[10.5px] tracking-[0.12em] text-ink-faint">
          {mode === "mic" ? "MICROPHONE LIVE" : "SAMPLE CALL RUNNING"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      <button
        onClick={onSample}
        className={`brand-gradient inline-flex items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-[14.5px] font-semibold text-white shadow-[0_14px_34px_-12px_rgba(79,70,229,0.8)] transition hover:brightness-[1.08] ${
          glow ? "sample-glow" : ""
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] fill-current" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
        Play a sample call
      </button>
      <button
        onClick={onMic}
        className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-line-strong bg-surface px-5 py-3.5 text-[14.5px] font-medium text-ink-muted transition hover:border-[rgba(79,70,229,0.5)] hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
        </svg>
        Use my microphone
      </button>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="a-rise rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {message}
    </div>
  );
}
