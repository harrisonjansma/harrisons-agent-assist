/**
 * Prominent "this is a demo" callout: makes unmistakably clear this is an
 * independent portfolio project — it does NOT touch Capital One's internal
 * systems, data, or code. The tech stack / build disclosure lives in the
 * "How this works" section.
 */
export function Disclaimer() {
  return (
    <section className="animate-rise overflow-hidden rounded-2xl border border-amber-400/25 bg-amber-400/[0.06]">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:gap-4 sm:p-5">
        <div
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-300"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-amber-100">Demo only — not a Capital One system</p>
          <p className="text-sm leading-relaxed text-amber-100/75">
            This is an independent portfolio project built by Harrison Jansma. It is{" "}
            <span className="font-semibold text-amber-100">not connected to Capital One</span> and uses
            none of its internal systems, data, models, or code — it&rsquo;s a public re-build of the{" "}
            <span className="whitespace-nowrap">shape</span> of that work. The sample call is a
            simulated support session for <span className="font-semibold text-amber-100">Shopfolio</span>{" "}
            (my other portfolio project); the caller and conversation are fictional and the knowledge base
            is Shopfolio&rsquo;s own help docs.
          </p>
        </div>
      </div>
    </section>
  );
}
