/**
 * Prominent "this is a demo" callout: makes unmistakably clear this is an
 * independent portfolio project — it does NOT touch Capital One's internal
 * systems, data, or code. The tech stack / build disclosure lives in the
 * "How this works" section.
 *
 * The copy here is a legal notice — restyle it, but do not edit the wording.
 */
export function Disclaimer() {
  return (
    <section className="flex gap-3.5 rounded-[14px] border border-[rgba(245,158,11,0.32)] bg-[#fffbeb] px-4 py-3.5">
      <div
        aria-hidden
        className="grid h-7 w-7 flex-none place-items-center rounded-lg border border-[rgba(245,158,11,0.3)] bg-[#fef3c7] text-[#d97706]"
      >
        <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] fill-none stroke-current" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0Z"
          />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#78350f]">Demo only — not a Capital One system</p>
        <p className="mt-[5px] text-[13px] leading-[1.6] text-[#92400e]">
          This is an independent portfolio project built by Harrison Jansma. It is{" "}
          <span className="font-semibold text-[#78350f]">not connected to Capital One</span> and uses none of its
          internal systems, data, models, or code — it&rsquo;s a public re-build of the{" "}
          <span className="whitespace-nowrap">shape</span> of that work. The sample call simulates a support
          session for{" "}
          <a
            href="https://shopfolio.app"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#78350f] underline decoration-dotted underline-offset-2"
          >
            Shopfolio
          </a>{" "}
          — a portfolio project I built for my wife to help manage her{" "}
          <a
            href="https://www.pinterest.com/itsamyjansma/my-fashion-favorites-itsamyjansma/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#78350f] underline decoration-dotted underline-offset-2"
          >
            Pinterest content ↗
          </a>
          . The caller and conversation are fictional.
        </p>
      </div>
    </section>
  );
}
