/** Shared shell for the two un-collapsed info sections (04 / 05). */
export function InfoCard({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface-soft px-5 py-[18px]">
      <div className="mb-3 flex items-baseline gap-2.5">
        <span className="font-mono text-[10px] tracking-[0.16em] text-ink-ghost">{index}</span>
        <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.1em] text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}
