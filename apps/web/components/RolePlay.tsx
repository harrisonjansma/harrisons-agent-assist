/**
 * Guidance shown only during a LIVE mic session. Visitors don't know what to
 * say, so give them a role and a menu of issues — each of which maps to a
 * procedure doc in the corpus, so RAG actually retrieves something.
 */
const ISSUES: string[] = [
  "My storefront is on my own domain and it shows “your connection is not secure” — the SSL certificate is stuck on pending.",
  "The posts I scheduled never went out — they’re stuck in the queue marked pending.",
  "My Amazon product links aren’t picking up my associate tag.",
  "I’m trying to import my catalog from LTK / ShopMy and it won’t come in.",
  "My link clicks aren’t showing any analytics.",
  "I want to export all my data — am I locked in if I leave?",
];

export function RolePlay() {
  return (
    <section className="animate-rise overflow-hidden rounded-2xl border border-[var(--brand)]/25 bg-[var(--brand)]/[0.06]">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:gap-4 sm:p-5">
        <div
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--brand)]/30 bg-[var(--brand)]/10 text-brand-ink"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18v-1a3 3 0 0 1 6 0v1M12 3a4 4 0 0 1 0 8 4 4 0 0 1 0-8Z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">You&rsquo;re the caller — roleplay a support call 🎙️</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Pretend you&rsquo;re a creator/influencer using{" "}
            <a
              href="https://shopfolio.app"
              target="_blank"
              rel="noreferrer"
              className="text-brand-ink underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              shopfolio.app
            </a>{" "}
            — a tool Harrison built for his wife to manage her{" "}
            <a
              href="https://www.pinterest.com/itsamyjansma/my-fashion-favorites-itsamyjansma/"
              target="_blank"
              rel="noreferrer"
              className="text-brand-ink underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              Pinterest content
            </a>{" "}
            — and you&rsquo;ve hit a snag. Speak as the <span className="text-ink">customer</span> — the copilot
            assists the agent. Try describing one of these:
          </p>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {ISSUES.map((issue) => (
              <li
                key={issue}
                className="flex items-start gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs leading-relaxed text-ink-muted"
              >
                <span aria-hidden className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]/70" />
                <span>“{issue}”</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-faint">
            Tip: sound frustrated (“this is the third day, I&rsquo;m losing sales!”) to trip the sub-second
            supervisor alert — then calm down and watch the sentiment gauge recover.
          </p>
        </div>
      </div>
    </section>
  );
}
