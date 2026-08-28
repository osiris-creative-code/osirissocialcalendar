export function InstagramReference({ handle }: { handle: string | null }) {
  const cells = Array.from({ length: 9 }, (_, i) => `/demo/ph-${(i % 5) + 1}.svg`);
  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
        Mevcut Instagram feed&apos;i
      </h2>
      <div className="grid grid-cols-3 gap-1">
        {cells.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" className="aspect-square w-full rounded-[3px] object-cover" />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-mute)]">
        {handle ? `@${handle}` : "Instagram bağlı değil"} — örnek feed (Phase 2&apos;de canlı)
      </p>
    </section>
  );
}
