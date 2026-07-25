import type { ConnState } from "../lib/useCopilot";

const GITHUB_URL = "https://github.com/harrisonjansma/harrisons-agent-assist";
const SITE_URL = "https://harrisonjansma.com";

/** WS pill copy + dot colour, driven by the real connection state. */
const WS: Record<ConnState, { label: string; dot: string; pulse: boolean }> = {
  idle: { label: "WS IDLE", dot: "var(--ink-faint)", pulse: false },
  connecting: { label: "CONNECTING", dot: "#eab308", pulse: true },
  live: { label: "WS OPEN", dot: "#10b981", pulse: true },
  ended: { label: "WS IDLE", dot: "var(--ink-faint)", pulse: false },
  error: { label: "WS ERROR", dot: "#dc2626", pulse: false },
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[10px] tracking-[0.06em] text-ink-muted">
      {children}
    </span>
  );
}

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span
      aria-hidden
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${pulse ? "a-pulse" : ""}`}
      style={{ background: color }}
    />
  );
}

/** Identity + at-a-glance system health, in one line that doesn't eat the fold. */
export function TopRail({ conn }: { conn: ConnState }) {
  const ws = WS[conn];
  // The upstream services are only actually engaged during a live session.
  const engaged = conn === "live";
  const deepgram = engaged ? "#4f46e5" : "var(--ink-ghost)";
  const pgvector = engaged ? "#7c3aed" : "var(--ink-ghost)";

  return (
    <header className="a-rise flex items-center justify-between gap-5 rounded-[14px] border border-line bg-white/[0.82] px-3.5 py-2.5 backdrop-blur-[6px]">
      <div className="flex min-w-0 items-center gap-3">
        {/* Live Call Copilot mark — a live-audio waveform */}
        <div className="brand-gradient grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] shadow-[0_8px_22px_-8px_rgba(79,70,229,0.75)]">
          <svg viewBox="0 0 64 64" className="h-[19px] w-[19px]" aria-hidden fill="#fff">
            <rect x="10" y="24" width="6" height="16" rx="3" />
            <rect x="20" y="18" width="6" height="28" rx="3" />
            <rect x="30" y="10" width="6" height="44" rx="3" />
            <rect x="40" y="18" width="6" height="28" rx="3" />
            <rect x="50" y="26" width="6" height="12" rx="3" />
          </svg>
        </div>
        <span className="truncate font-display text-[15px] font-semibold tracking-[-0.01em]">
          Live Call Copilot
        </span>
        <span className="hidden shrink-0 rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-ink-faint sm:inline">
          v0.1.0
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <span className="hidden mid:inline">
          <Pill>
            <Dot color={ws.dot} pulse={ws.pulse} />
            {ws.label}
          </Pill>
        </span>
        <span className="hidden wide:inline">
          <Pill>
            <Dot color={deepgram} />
            DEEPGRAM
          </Pill>
        </span>
        <span className="hidden wide:inline">
          <Pill>
            <Dot color={pgvector} />
            PGVECTOR
          </Pill>
        </span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub repository"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-muted transition hover:border-line-strong hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="h-[13px] w-[13px] fill-current" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          source
        </a>
        <a
          href={SITE_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 pl-1"
          aria-label="Harrison Jansma"
        >
          <span className="brand-gradient block shrink-0 rounded-full p-[2px]">
            <img
              src="/harrison.png"
              alt="Harrison Jansma"
              width={30}
              height={30}
              className="block h-[30px] w-[30px] rounded-full border-2 border-white object-cover object-[50%_28%]"
            />
          </span>
          <span className="hidden text-xs font-semibold text-ink sm:inline">Harrison Jansma</span>
        </a>
      </div>
    </header>
  );
}
