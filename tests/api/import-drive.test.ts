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
import { POST as setSource } from "@/app/api/brands/[id]/sources/route";
import { GET as listBrands } from "@/app/api/brands/route";

const AUTH = "ritim_team=1; ritim_actor=Derya|yonetici";
const j = (u: string, m: string, b?: unknown) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie: AUTH },
    body: b ? JSON.stringify(b) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const DRIVE_LIST = {
  files: [
    { id: "f1", name: "post-kaydirmali 1.jpg", mimeType: "image/jpeg" },
    { id: "f2", name: "reel_1.mp4", mimeType: "video/mp4" },
  ],
};

beforeEach(() => {
  process.env.GOOGLE_API_KEY = "KEY";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes("googleapis.com/drive/v3/files?")) {
        return { ok: true, json: async () => DRIVE_LIST } as unknown as Response;
      }
      // per-file alt=media download
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

async function planWithDriveBrand() {
  const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[0].id;
  await setSource(
    j(`/api/brands/${brandId}/sources`, "POST", {
      url: "https://drive.google.com/drive/folders/1AbC_dEf_ghIJ_klmn_opqr_stuv",
    }),
    ctx(brandId),
  );
  return (
    await createPlan(
      j("/api/plans", "POST", {
        brandId,
        title: "Eylül",
        rangeStart: "2026-09-01",
        rangeEnd: "2026-09-21",
        prompt: "2 günde bir post",
      }),
    )
  ).json();
}

describe("import-drive", () => {
  it("imports every media file once, then skips them on a second run", async () => {
    const plan = await planWithDriveBrand();

    const first = await importDrive(j(`/api/plans/${plan.id}/import-drive`, "POST"), ctx(plan.id));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ imported: 2, skipped: 0, failed: [] });

    const assets = await (await listAssets(j(`/api/plans/${plan.id}/assets`, "GET"), ctx(plan.id))).json();
    expect(assets).toHaveLength(2);
    expect(assets.find((a: { name: string }) => a.name === "reel_1.mp4").kind).toBe("video");

    const second = await importDrive(j(`/api/plans/${plan.id}/import-drive`, "POST"), ctx(plan.id));
    expect(await second.json()).toMatchObject({ imported: 0, skipped: 2 });
  });

  it("400s when GOOGLE_API_KEY is missing", async () => {
    const plan = await planWithDriveBrand();
    delete process.env.GOOGLE_API_KEY;
    const res = await importDrive(j(`/api/plans/${plan.id}/import-drive`, "POST"), ctx(plan.id));
    expect(res.status).toBe(400);
  });

  it("400s when the brand has no Drive folder", async () => {
    const brandId = (await (await listBrands(j("/api/brands", "GET"))).json())[1].id;
    const plan = await (
      await createPlan(
        j("/api/plans", "POST", {
          brandId,
          title: "X",
          rangeStart: "2026-09-01",
          rangeEnd: "2026-09-21",
          prompt: "her gün story",
        }),
      )
    ).json();
    const res = await importDrive(j(`/api/plans/${plan.id}/import-drive`, "POST"), ctx(plan.id));
    expect(res.status).toBe(400);
  });
});
