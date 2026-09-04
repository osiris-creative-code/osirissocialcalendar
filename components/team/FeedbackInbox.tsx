import type { Annotation, Comment, PlanItem } from "@/lib/types";
import { trDayMonth } from "@/lib/format";

const STAGE_TAG: Record<string, string> = { internal: "İç", brand: "Marka" };
const STATUS_TAG: Record<string, string> = { approved: "Onaylandı", changes: "Revize", none: "" };

export function FeedbackInbox({
  comments,
  annotations,
  items,
  onJump,
}: {
  comments: Comment[];
  annotations: Annotation[];
  items: PlanItem[];
  /** Called with the item id when a feedback entry is clicked — jump to & highlight it. */
  onJump?: (itemId: string) => void;
}) {
  const byItem = items.map((item) => ({
    item,
    comments: comments.filter((c) => c.planItemId === item.id),
    annotations: annotations.filter((a) => a.planItemId === item.id),
  }));
  const total = comments.length + annotations.length;

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-mute)]">
        Geri bildirim {total > 0 ? `· ${total}` : ""}
      </h2>
      {total === 0 && <p className="text-[13px] text-[var(--text-mute)]">Henüz yorum yok.</p>}
      <div className="flex flex-col gap-3">
        {byItem.map(
          ({ item, comments: cs, annotations: as }) =>
            (cs.length > 0 || as.length > 0) && (
              <div key={item.id} className="border-l-2 border-[var(--brand-soft)] pl-3">
                {onJump ? (
                  <button
                    type="button"
                    onClick={() => onJump(item.id)}
                    className="font-mono text-[11px] text-[var(--brand)] underline decoration-dotted underline-offset-2 hover:text-[var(--text)]"
                  >
                    {trDayMonth(item.date)} · {item.type.toUpperCase()} — göster ↴
                  </button>
                ) : (
                  <div className="font-mono text-[11px] text-[var(--text-mute)]">
                    {trDayMonth(item.date)} · {item.type.toUpperCase()}
                  </div>
                )}
                {cs.map((c) => (
                  <p key={c.id} className="mt-1 text-[12.5px] text-[var(--text-dim)]">
                    <span className="rounded bg-[var(--surface-2)] px-1 text-[10px] font-semibold">
                      {STAGE_TAG[c.stage]}
                    </span>{" "}
                    <b className="text-[var(--text)]">{c.authorName}</b> {c.body}
                    {STATUS_TAG[c.status] && (
                      <span className="ml-1 text-[11px] text-[var(--accent)]">· {STATUS_TAG[c.status]}</span>
                    )}
                  </p>
                ))}
                {as.map((a) => (
                  <p key={a.id} className="mt-1 text-[12.5px] text-[var(--text-dim)]">
                    <span className="rounded bg-[var(--surface-2)] px-1 text-[10px] font-semibold">
                      {STAGE_TAG[a.stage]} · iğne
                    </span>{" "}
                    <b className="text-[var(--text)]">{a.authorName}</b> {a.note}
                  </p>
                ))}
              </div>
            ),
        )}
      </div>
    </section>
  );
}
