import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlanEditor } from "@/components/team/PlanEditor";
import type { Annotation, Plan, PlanItem } from "@/lib/types";

const plan = {
  id: "p",
  theme: { primary: "#000000", accent: "#111111" },
  rangeStart: "2026-09-01",
  rangeEnd: "2026-09-02",
} as Plan;

const items: PlanItem[] = [
  { id: "i1", planId: "p", date: "2026-09-01", type: "post", sort: 0, caption: "A", specialLabel: null, media: [{ url: "/img1.jpg", kind: "image", slideOrder: 1 }], isGap: false, hidden: false, publishedAt: null },
  { id: "i2", planId: "p", date: "2026-09-02", type: "post", sort: 1, caption: "B", specialLabel: null, media: [], isGap: false, hidden: false, publishedAt: null },
];

const pin: Annotation = {
  id: "a1",
  planItemId: "i1",
  mediaIndex: 0,
  xPct: 30,
  yPct: 70,
  note: "logo çok küçük",
  stage: "brand",
  authorName: "Marka",
  createdAt: "2026-09-01T00:00:00Z",
};

describe("PlanEditor — shared", () => {

  it("gives each item a stable id and rings the highlighted one", () => {
    const { container } = render(
      <PlanEditor plan={plan} items={items} onChange={vi.fn()} highlightItemId="i2" />,
    );
    expect(container.querySelector("#plan-item-i1")).toBeInTheDocument();
    expect(container.querySelector("#plan-item-i1")).not.toHaveClass("ring-2");
    expect(container.querySelector("#plan-item-i2")).toHaveClass("ring-2");
  });

  it("emits a theme change", () => {
    const onThemeChange = vi.fn();
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} onThemeChange={onThemeChange} />);
    fireEvent.input(screen.getByLabelText("Vurgu"), { target: { value: "#abcdef" } });
    expect(onThemeChange).toHaveBeenCalledWith({ primary: "#000000", accent: "#abcdef" });
  });

  it("does not emit while typing a caption — only on blur", () => {
    const onChange = vi.fn();
    render(<PlanEditor plan={plan} items={items} onChange={onChange} defaultView="list" />);
    const box = screen.getAllByLabelText("Post açıklaması")[0];

    fireEvent.change(box, { target: { value: "yeni metin" } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(box);
    const emitted = onChange.mock.calls.at(-1)![0] as PlanItem[];
    expect(emitted.find((i) => i.id === "i1")!.caption).toBe("yeni metin");
  });

  it("shows a summary of what is in the plan", () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} />);
    expect(screen.getByText("post")).toBeInTheDocument();
    expect(screen.getByText("boş gün")).toBeInTheDocument();
  });
});

describe("PlanEditor — calendar view", () => {
  it("is the default and offers a switch to the list", () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Takvim" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Liste" })).toHaveAttribute("aria-pressed", "false");
  });

  it("lays the range out as weeks with a cell for every day, empty ones included", () => {
    // A fortnight with content on only two days — the gaps are the point.
    const fortnight = { ...plan, rangeStart: "2026-09-01", rangeEnd: "2026-09-14" } as Plan;
    const { container } = render(
      <PlanEditor plan={fortnight} items={items} onChange={vi.fn()} />,
    );
    // 1 Sept 2026 is a Tuesday, so the grid squares off to whole Mon–Sun weeks.
    expect(container.querySelectorAll("[data-date]")).toHaveLength(21);
    expect(container.querySelector('[data-date="2026-09-01"]')).toBeInTheDocument();
    // 14 days in range, 2 of them filled
    expect(screen.getAllByText("boş")).toHaveLength(12);
  });

  it("does not scroll sideways — the whole plan is on screen", () => {
    const { container } = render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} />);
    expect(container.querySelector(".overflow-x-auto")).not.toBeInTheDocument();
  });

  it("badges a card that has pin feedback and opens the image full size", () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} annotations={[pin]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "İşaretli görseli büyüt" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByTestId("lightbox-pin")).toHaveLength(1);
  });

  it("switches to the list view when asked", async () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Liste" }));
    expect(screen.getByRole("button", { name: "Liste" })).toHaveAttribute("aria-pressed", "true");
    // the date picker only exists in the list view; the swap is animated
    await waitFor(() => expect(screen.getAllByLabelText("Tarih").length).toBeGreaterThan(0));
  });
});

describe("PlanEditor — list view", () => {
  it("groups rows under one heading per day", () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} defaultView="list" />);
    expect(screen.getByText("1 Eylül")).toBeInTheDocument();
    expect(screen.getByText("2 Eylül")).toBeInTheDocument();
  });

  it("shows a dash instead of a caption editor for story items", () => {
    render(
      <PlanEditor
        plan={plan}
        items={[{ ...items[0], type: "story", caption: null }]}
        onChange={vi.fn()}
        defaultView="list"
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows each pin at its real xPct/yPct with the note beside it", () => {
    const { container } = render(
      <PlanEditor
        plan={plan}
        items={items}
        onChange={vi.fn()}
        annotations={[pin]}
        defaultView="list"
      />,
    );
    expect(screen.getByText("logo çok küçük")).toBeInTheDocument();
    const marker = container.querySelector('span[title="logo çok küçük"]') as HTMLElement;
    expect(marker.style.left).toBe("30%");
    expect(marker.style.top).toBe("70%");
  });

  it("gives every row a drag handle", () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} defaultView="list" />);
    expect(screen.getAllByRole("button", { name: "Sürükle" })).toHaveLength(2);
  });
});

describe("PlanEditor — filling or replacing content from the asset pool", () => {
  const gapItem: PlanItem = { ...items[1], isGap: true };
  const asset = { id: "asset1", planId: "p", type: "post", kind: "image", url: "/new.jpg", name: "new.jpg", slideGroup: null, slideOrder: 1, sort: 0 };

  function stubFetch() {
    return vi.fn(async (url: string) => {
      if (url === "/api/plans/p/assets") return { ok: true, json: async () => [asset] };
      if (url === "/api/plans/p") return { ok: true, json: async () => ({ plan: {}, items: [items[0], gapItem] }) };
      if (url === "/api/plans/p/items/i2/attach-asset") {
        return {
          ok: true,
          json: async () => ({ ...gapItem, isGap: false, media: [{ url: "/new.jpg", kind: "image", slideOrder: 1 }] }),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
  }

  afterEach(() => vi.unstubAllGlobals());

  it("opens the asset picker for a gap item and fills it on selection", async () => {
    vi.stubGlobal("fetch", stubFetch());
    const onChange = vi.fn();
    render(<PlanEditor plan={plan} items={[items[0], gapItem]} onChange={onChange} defaultView="list" />);

    fireEvent.click(screen.getByRole("button", { name: "İçerikten seç" }));
    await waitFor(() => expect(screen.getByRole("img", { name: "new.jpg" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("img", { name: "new.jpg" }).closest("button")!);

    await waitFor(() => {
      const emitted = onChange.mock.calls.at(-1)![0] as PlanItem[];
      const updated = emitted.find((i) => i.id === "i2")!;
      expect(updated.isGap).toBe(false);
      expect(updated.media[0].url).toBe("/new.jpg");
    });
  });

  it("lets an already-filled item's media be replaced via the thumbnail", async () => {
    vi.stubGlobal("fetch", stubFetch());
    render(<PlanEditor plan={plan} items={[items[0], gapItem]} onChange={vi.fn()} defaultView="list" />);
    // items[0] (i1) is the already-filled row — its thumbnail is the replace trigger.
    fireEvent.click(screen.getAllByRole("button", { name: "Görseli değiştir" })[0]);
    await waitFor(() => expect(screen.getByText("Post seç")).toBeInTheDocument());
  });
});

describe("PlanEditor — manual carousel in the calendar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("enters select mode and shows a checkbox only on post cards", () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Kaydırmalı yap" }));
    expect(screen.getByText("Kaydırmalı yapmak istediğin post'ları seç")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /kaydırmalı için seç/ })).toHaveLength(2);
  });

  it("enables Birleştir only once two are selected, and calls the merge API", async () => {
    const merged = [{ ...items[0], media: [...items[0].media, { url: "/img2.jpg", kind: "image", slideOrder: 2 }] }];
    const fetchSpy = vi.fn(async (url: string) => {
      expect(url).toBe("/api/plans/p/merge-items");
      return { ok: true, json: async () => ({ items: merged }) };
    });
    vi.stubGlobal("fetch", fetchSpy);

    const onChange = vi.fn();
    render(<PlanEditor plan={plan} items={items} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Kaydırmalı yap" }));

    const boxes = screen.getAllByRole("button", { name: /kaydırmalı için seç/ });
    fireEvent.click(boxes[0]);
    expect(screen.getByRole("button", { name: "Birleştir" })).toBeDisabled();
    fireEvent.click(boxes[1]);
    expect(screen.getByRole("button", { name: "Birleştir" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Birleştir" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(merged));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/plans/p/merge-items",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows the server's refusal instead of silently doing nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({ error: "sadece post içerikleri kaydırmalı yapılabilir" }) })),
    );
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Kaydırmalı yap" }));
    const boxes = screen.getAllByRole("button", { name: /kaydırmalı için seç/ });
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    fireEvent.click(screen.getByRole("button", { name: "Birleştir" }));
    await waitFor(() => expect(screen.getByText(/sadece post içerikleri/)).toBeInTheDocument());
  });

  it("leaving select mode clears the selection", () => {
    render(<PlanEditor plan={plan} items={items} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Kaydırmalı yap" }));
    fireEvent.click(screen.getAllByRole("button", { name: /kaydırmalı için seç/ })[0]);
    expect(screen.getByText("1 post seçildi")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Seçimden vazgeç" }));
    expect(screen.queryByText(/post seçildi/)).not.toBeInTheDocument();
  });
});
