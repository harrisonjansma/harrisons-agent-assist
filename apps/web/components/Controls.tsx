import { useEffect, useState } from "react";
import type { ConnState } from "../lib/useCopilot";

// Once per page load: the sample button rainbow-glows briefly to draw the eye,
// then settles into a normal button so it doesn't get annoying.
let hasGlowed = false;

export function Controls(props: {
  conn: ConnState;
  onMic: () => void;
  onSample: () => void;
  onStop: () => void;
}) {
  const { conn, onMic, onSample, onStop } = props;
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
      <button
        onClick={onStop}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-[var(--brand)]/40"
      >
        <span className="h-2.5 w-2.5 rounded-[3px] bg-red-500" />
        Stop
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap">
      <button
        onClick={onSample}
        className={`brand-gradient inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(79,70,229,0.5)] transition hover:brightness-110 ${
          glow ? "sample-glow" : ""
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
        Play a sample call
      </button>
      <button
        onClick={onMic}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:border-[var(--brand)]/50 hover:text-ink"
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
    <div className="animate-rise rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {message}
    </div>
  );
}
