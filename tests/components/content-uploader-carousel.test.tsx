import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContentUploader } from "@/components/team/ContentUploader";
import type { PlanAsset } from "@/lib/types";

function asset(over: Partial<PlanAsset> & { id: string; name: string; type: PlanAsset["type"] }): PlanAsset {
  return {
    planId: "p",
    kind: "image",
    url: `/u/${over.id}.jpg`,
    slideGroup: null,
    slideOrder: 1,
    sort: 0,
    ...over,
  };
}

const assets: PlanAsset[] = [
  asset({ id: "a1", name: "IMG_1.jpg", type: "post", sort: 0 }),
  asset({ id: "a2", name: "IMG_2.jpg", type: "post", sort: 1 }),
  asset({ id: "a3", name: "IMG_3.jpg", type: "post", sort: 2 }),
  asset({ id: "s1", name: "ST_1.jpg", type: "story", sort: 3 }),
];

afterEach(() => vi.unstubAllGlobals());

describe("ContentUploader — manual carousel creation", () => {
  it("only offers a select checkbox on post chips, not on story/reel chips", () => {
    render(<ContentUploader planId="p" initialAssets={assets} />);
    expect(screen.getByLabelText("IMG_1.jpg — kaydırmalı için seç")).toBeInTheDocument();
    expect(screen.queryByLabelText("ST_1.jpg — kaydırmalı için seç")).not.toBeInTheDocument();
  });

  it("only shows the merge button once two or more are selected", () => {
    render(<ContentUploader planId="p" initialAssets={assets} />);
    fireEvent.click(screen.getByLabelText("IMG_1.jpg — kaydırmalı için seç"));
    expect(screen.queryByRole("button", { name: "Kaydırmalı yap" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText("IMG_2.jpg — kaydırmalı için seç"));
    expect(screen.getByRole("button", { name: "Kaydırmalı yap" })).toBeEnabled();
  });

  it("merges the selected posts and clears the selection on success", async () => {
    const merged = assets.map((a) =>
      a.id === "a1" || a.id === "a2"
        ? { ...a, slideGroup: "g1", slideOrder: a.id === "a1" ? 1 : 2 }
        : a,
    );
    const fetchSpy = vi.fn(async (url: string) => {
      expect(url).toBe("/api/plans/p/merge-carousel");
      return { ok: true, json: async () => ({ assets: merged, slideGroup: "g1" }) };
    });
    vi.stubGlobal("fetch", fetchSpy);

    render(<ContentUploader planId="p" initialAssets={assets} />);
    fireEvent.click(screen.getByLabelText("IMG_1.jpg — kaydırmalı için seç"));
    fireEvent.click(screen.getByLabelText("IMG_2.jpg — kaydırmalı için seç"));
    fireEvent.click(screen.getByRole("button", { name: "Kaydırmalı yap" }));

    await waitFor(() => expect(screen.getAllByText("1/2")).toHaveLength(1));
    expect(screen.queryByRole("button", { name: "Kaydırmalı yap" })).not.toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/plans/p/merge-carousel",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows the server's error when the merge is refused", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({ error: "sadece post görselleri kaydırmalı yapılabilir" }) })),
    );
    render(<ContentUploader planId="p" initialAssets={assets} />);
    fireEvent.click(screen.getByLabelText("IMG_1.jpg — kaydırmalı için seç"));
    fireEvent.click(screen.getByLabelText("IMG_2.jpg — kaydırmalı için seç"));
    fireEvent.click(screen.getByRole("button", { name: "Kaydırmalı yap" }));
    await waitFor(() => expect(screen.getByText(/sadece post görselleri/)).toBeInTheDocument());
  });
});
