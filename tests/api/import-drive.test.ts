import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/uploads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/uploads")>();
  return {
    ...actual,
    putUpload: vi.fn(async ({ name }: { name: string }) => ({ url: `https://stored/${name}` })),
  };
});

import { POST as createPlan } from "@/app/api/plans/route";
import { GET as listAssets } from "@/app/api/plans/[id]/assets/route";
import { POST as importDrive } from "@/app/api/plans/[id]/import-drive/route";
import { GET as listBrands } from "@/app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const FOLDER = "application/vnd.google-apps.folder";
const TREE: Record<string, unknown> = {
  ROOT: { files: [{ id: "P", name: "POST", mimeType: FOLDER }, { id: "S", name: "STORY", mimeType: FOLDER }] },
  P: { files: [{ id: "p1", name: "ERÇİ 3-01.jpg", mimeType: "image/jpeg" }] },
  S: { files: [{ id: "s1", name: "story-a.jpg", mimeType: "image/jpeg" }, { id: "s2", name: "reel-clip.mov", mimeType: "video/quicktime" }] },
};

beforeEach(() => {
  process.env.GOOGLE_API_KEY = "KEY";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = decodeURIComponent(String(input).replace(/\+/g, " "));
      const listMatch = /'([^']+)' in parents/.exec(url);
      if (listMatch) {
        return { ok: true, json: async () => TREE[listMatch[1]] ?? { files: [] } } as unknown as Response;
      }
      return {
        ok: true,
        headers: new Headers({ "content-type": "image/jpeg" }),
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      } as unknown as Response;
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_API_KEY;
});

async function planWithDrive(driveFolderUrl?: string) {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  return (
    await createPlan(
      j("/api/plans", "POST", {
        brandId,
        title: "Eylül",
        rangeStart: "2026-09-01",
        rangeEnd: "2026-09-21",
        prompt: "2 günde bir post",
        driveFolderUrl,
      }),
    )
  ).json();
}

describe("import-drive", () => {
  it("walks the shoot folder, imports once, skips on a second run", async () => {
    const plan = await planWithDrive("https://drive.google.com/drive/folders/ROOT");

    const first = await importDrive(j(`/api/plans/${plan.id}/import-drive`, "POST"), ctx(plan.id));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ imported: 3, skipped: 0, failed: [] });

    const assets = await (await listAssets(j(`/api/plans/${plan.id}/assets`, "GET"), ctx(plan.id))).json();
    expect(assets).toHaveLength(3);
    expect(assets.find((a: { name: string }) => a.name === "ERÇİ 3-01.jpg").type).toBe("post");
    expect(assets.find((a: { name: string }) => a.name === "story-a.jpg").type).toBe("story");
    const mov = assets.find((a: { name: string }) => a.name === "reel-clip.mov");
    expect(mov.type).toBe("story"); // it's inside STORY/, folder wins over name
    expect(mov.webPlayable).toBe(false);

    const second = await importDrive(j(`/api/plans/${plan.id}/import-drive`, "POST"), ctx(plan.id));
    expect(await second.json()).toMatchObject({ imported: 0, skipped: 3 });
  });

  it("400s when GOOGLE_API_KEY is missing", async () => {
    const plan = await planWithDrive("https://drive.google.com/drive/folders/ROOT");
    delete process.env.GOOGLE_API_KEY;
    const res = await importDrive(j(`/api/plans/${plan.id}/import-drive`, "POST"), ctx(plan.id));
    expect(res.status).toBe(400);
  });

  it("400s when the plan has no Drive link", async () => {
    const plan = await planWithDrive();
    const res = await importDrive(j(`/api/plans/${plan.id}/import-drive`, "POST"), ctx(plan.id));
    expect(res.status).toBe(400);
  });
});
