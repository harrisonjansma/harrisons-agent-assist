const GITHUB_URL = "https://github.com/harrisonjansma/call-copilot";
const SITE_URL = "https://harrisonjansma.com";

function IconLink({ href, children, label }: { href: string; children: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm text-ink-muted transition hover:border-[var(--line-strong)] hover:text-ink"
    >
      {children}
    </a>
  );
}

export function Header() {
  return (
    <header className="animate-rise">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {/* Monogram mark */}
          <div className="brand-gradient grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-base font-bold tracking-tight text-white shadow-[0_10px_30px_-8px_rgba(79,140,255,0.6)]">
            HJ
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-ink">
              Real-time agent assist
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="brand-text">Live Call Copilot</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              Talk, and watch a live transcript, self-drafting notes, retrieved procedure docs, and a
              sub-second frustration alert — all in the browser.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 sm:flex-col sm:items-end">
          <span className="text-xs text-ink-faint">built by</span>
          <a href={SITE_URL} target="_blank" rel="noreferrer" className="text-sm font-semibold text-ink hover:text-white">
            Harrison Jansma
          </a>
          <div className="mt-1 flex gap-2">
            <IconLink href={GITHUB_URL} label="GitHub repository">
              <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </IconLink>
            <IconLink href={SITE_URL} label="Personal site">
              site ↗
            </IconLink>
          </div>
        </div>
      </div>
    </header>
  );
}
