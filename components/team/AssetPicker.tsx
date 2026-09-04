"use client";

import { useEffect, useState } from "react";
import type { ItemType, PlanAsset, PlanItem } from "@/lib/types";
import { ITEM_TYPE_LABELS } from "@/lib/labels";
import { Modal } from "@/components/ui/Modal";
import { Thumb } from "@/components/ui/Thumb";
import { Toast } from "@/components/ui/Toast";

/**
 * "Pick an uploaded file for this slot" — fills an empty item or replaces
 * whatever media one already has. Fetches fresh every time it opens rather
 * than trusting a prop, because the upload panel keeps its own local state
 * that never syncs back up to the editor — a file uploaded a minute ago
 * would otherwise not show up here.
 */
export function AssetPicker({
  planId,
  itemId,
  itemType,
  open,
  onClose,
  onAttached,
}: {
  planId: string;
  /** The item being filled or replaced. */
  itemId: string;
  /** Only assets of this type are offered — a story slot can't take a reel. */
  itemType: ItemType;
  open: boolean;
  onClose: () => void;
  /** Called with the updated item once the server confirms the attach. */
  onAttached: (item: PlanItem) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<PlanAsset[]>([]);
  const [usedUrls, setUsedUrls] = useState<Set<string>>(new Set());
  const [attachingId, setAttachingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/plans/${planId}/assets`).then((r) => r.json()),
      fetch(`/api/plans/${planId}`).then((r) => r.json()),
    ])
      .then(([assetList, planData]: [PlanAsset[], { items: PlanItem[] }]) => {
        setAssets(assetList.filter((a) => a.type === itemType && !a.placeholder));
        setUsedUrls(new Set(planData.items.flatMap((i) => i.media.map((m) => m.url))));
      })
      .catch(() => Toast.show("İçerikler yüklenemedi"))
      .finally(() => setLoading(false));
  }, [open, planId, itemType]);

  const attach = async (asset: PlanAsset) => {
    setAttachingId(asset.id);
    try {
      const res = await fetch(`/api/plans/${planId}/items/${itemId}/attach-asset`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: asset.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Toast.show(data.error || "Görsel eklenemedi");
        return;
      }
      onAttached(data as PlanItem);
      onClose();
    } catch (e) {
      Toast.show(`Görsel eklenemedi: ${(e as Error).message}`);
    } finally {
      setAttachingId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" labelledBy="asset-picker-title">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 id="asset-picker-title" className="text-[14px] font-semibold">
            {ITEM_TYPE_LABELS[itemType]} seç
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="ml-auto rounded px-2 text-[18px] leading-none text-[var(--text-mute)] hover:text-[var(--text)]"
          >
            ×
          </button>
        </div>

        {loading && <p className="text-[12.5px] text-[var(--text-mute)]">Yükleniyor…</p>}

        {!loading && assets.length === 0 && (
          <p className="text-[12.5px] text-[var(--text-mute)]">
            Yüklenmiş {ITEM_TYPE_LABELS[itemType].toLowerCase()} yok. Önce “İçerik” kısmından yükle.
          </p>
        )}

        {!loading && assets.length > 0 && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {assets.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => attach(a)}
                disabled={attachingId !== null}
                className="group relative aspect-square overflow-hidden rounded-[var(--r-md)] border border-[var(--border)] hover:border-[var(--brand)] disabled:opacity-60"
              >
                <Thumb media={a} alt={a.name} className="h-full w-full object-cover" />
                {usedUrls.has(a.url) && (
                  <span className="absolute left-1 top-1 rounded bg-black/55 px-1 py-0.5 text-[9px] font-semibold text-white">
                    kullanılıyor
                  </span>
                )}
                {attachingId === a.id && (
                  <span className="absolute inset-0 grid place-items-center bg-black/40 text-[11px] text-white">
                    …
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
