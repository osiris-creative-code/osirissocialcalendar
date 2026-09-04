import type { ItemDiff } from "@/lib/diff";
import { trDayMonth } from "@/lib/format";
import { ITEM_TYPE_LABELS as TYPE } from "@/lib/labels";

export function DiffList({ diff }: { diff: ItemDiff[] }) {
  if (diff.length === 0) {
    return <p className="text-[12.5px] text-[var(--text-mute)]">Değişiklik yok.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {diff.map((d, i) => (
        <li key={i} className="text-[12.5px] text-[var(--text-dim)]">
          <span className="font-mono text-[11px] text-[var(--text-mute)]">
            {trDayMonth(d.kind === "moved" ? d.toDate : d.date)} · {TYPE[d.type as keyof typeof TYPE] ?? d.type}
          </span>{" "}
          {d.kind === "added" && <span className="text-[var(--ok)]">＋ eklendi</span>}
          {d.kind === "removed" && <span className="text-[var(--accent)]">－ çıkarıldı</span>}
          {d.kind === "moved" && (
            <span>
              taşındı: {trDayMonth(d.fromDate)} → {trDayMonth(d.toDate)}
            </span>
          )}
          {d.kind === "media" && <span>görsel değişti</span>}
          {d.kind === "caption" && (
            <span>
              açıklama değişti
              <span className="mt-0.5 block border-l-2 border-[var(--border-strong)] pl-2 text-[var(--text-mute)] line-through">
                {d.before || "—"}
              </span>
              <span className="block border-l-2 border-[var(--brand)] pl-2 text-[var(--text)]">
                {d.after || "—"}
              </span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
