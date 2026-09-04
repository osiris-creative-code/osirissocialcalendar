import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AssetPicker } from "@/components/team/AssetPicker";
import type { PlanAsset, PlanItem } from "@/lib/types";

const postAsset: PlanAsset = {
  id: "a1",
  planId: "p",
  type: "post",
  kind: "image",
  url: "/a1.jpg",
  name: "a1.jpg",
  slideGroup: null,
  slideOrder: 1,
  sort: 0,
};
const storyAsset: PlanAsset = { ...postAsset, id: "a2", type: "story", url: "/a2.jpg", name: "a2.jpg" };

const existingItem: PlanItem = {
  id: "i1",
  planId: "p",
  date: "2026-09-01",
  type: "post",
  sort: 0,
  caption: "x",
  specialLabel: null,
  media: [{ url: "/a1.jpg", kind: "image", slideOrder: 1 }],
  isGap: false,
  hidden: false,
  publishedAt: null,
};

function stubFetch(assets: PlanAsset[], items: PlanItem[]) {
  return vi.fn(async (url: string) => {
    if (url === "/api/plans/p/assets") return { ok: true, json: async () => assets };
    if (url === "/api/plans/p") return { ok: true, json: async () => ({ plan: {}, items }) };
    if (url === "/api/plans/p/items/i1/attach-asset") {
      return { ok: true, json: async () => ({ ...existingItem, media: [{ url: "/a2.jpg", kind: "image", slideOrder: 1 }] }) };
    }
    throw new Error(`unexpected fetch ${url}`);
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("AssetPicker", () => {
  it("only offers assets matching the item's type", async () => {
    vi.stubGlobal("fetch", stubFetch([postAsset, storyAsset], [existingItem]));
    render(
      <AssetPicker planId="p" itemId="i1" itemType="post" open onClose={vi.fn()} onAttached={vi.fn()} />,
    );
    await waitFor(() => expect(screen.getAllByRole("button").length).toBeGreaterThan(1));
    expect(screen.getAllByRole("img")).toHaveLength(1); // only the post asset, not the story one
  });

  it("flags an asset that is already used by another item", async () => {
    vi.stubGlobal("fetch", stubFetch([postAsset], [existingItem]));
    render(
      <AssetPicker planId="p" itemId="i1" itemType="post" open onClose={vi.fn()} onAttached={vi.fn()} />,
    );
    await waitFor(() => expect(screen.getByText("kullanılıyor")).toBeInTheDocument());
  });

  it("says plainly when nothing of that type has been uploaded", async () => {
    vi.stubGlobal("fetch", stubFetch([], []));
    render(
      <AssetPicker planId="p" itemId="i1" itemType="reel" open onClose={vi.fn()} onAttached={vi.fn()} />,
    );
    await waitFor(() => expect(screen.getByText(/Yüklenmiş reels yok/)).toBeInTheDocument());
  });

  it("attaches the clicked asset and closes", async () => {
    vi.stubGlobal("fetch", stubFetch([storyAsset], [existingItem]));
    const onAttached = vi.fn();
    const onClose = vi.fn();
    render(
      <AssetPicker planId="p" itemId="i1" itemType="story" open onClose={onClose} onAttached={onAttached} />,
    );
    await waitFor(() => expect(screen.getAllByRole("button").length).toBeGreaterThan(1));
    fireEvent.click(screen.getAllByRole("img")[0].closest("button")!);
    await waitFor(() => expect(onAttached).toHaveBeenCalled());
    expect(onAttached.mock.calls[0][0].media[0].url).toBe("/a2.jpg");
    expect(onClose).toHaveBeenCalled();
  });

  it("does not fetch anything while closed", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(
      <AssetPicker planId="p" itemId="i1" itemType="post" open={false} onClose={vi.fn()} onAttached={vi.fn()} />,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
