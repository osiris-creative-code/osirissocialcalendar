export { publishStats } from "@/lib/publish";

export function PublishProgress({
  published,
  total,
  color = "var(--brand)",
}: {
  published: number;
  total: number;
  color?: string;
}) {
  const pct = total ? Math.round((published / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[12px] text-[var(--text-dim)]">
        {published} / {total} paylaşıldı
      </span>
    </div>
  );
}
