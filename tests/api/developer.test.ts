import { describe, it, expect } from "vitest";
import { PATCH } from "@/app/api/brands/[id]/route";
import { GET as listBrands } from "@/app/api/brands/route";

const j = (u: string, m: string, b: unknown, cookie: string) =>
  new Request("http://t" + u, {
    method: m,
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(b),
  });

describe("brand archive permissions", () => {
  it("archive is refused for yönetici, allowed for developer", async () => {
    const brandId = (await (await listBrands(new Request("http://t/api/brands"))).json())[0].id;

    const asManager = await PATCH(
      j(`/api/brands/${brandId}`, "PATCH", { status: "archived" }, "ritim_team=1; ritim_actor=D|yonetici"),
      { params: Promise.resolve({ id: brandId }) },
    );
    expect(asManager.status).toBe(403);

    const asDev = await PATCH(
      j(
        `/api/brands/${brandId}`,
        "PATCH",
        { status: "archived" },
        "ritim_team=1; ritim_dev=1; ritim_actor=K|developer",
      ),
      { params: Promise.resolve({ id: brandId }) },
    );
    expect(asDev.status).toBe(200);
    expect((await asDev.json()).status).toBe("archived");
  });
});
