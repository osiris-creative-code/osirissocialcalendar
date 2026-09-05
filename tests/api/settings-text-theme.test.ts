import { describe, it, expect } from "vitest";
import { GET as getSettings, PATCH as patchSettings } from "@/app/api/settings/route";

const DEV_AUTH = "ritim_team=1; ritim_dev=1; ritim_actor=K|developer";
const j = (b: unknown, cookie = DEV_AUTH) =>
  new Request("http://t/api/settings", {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(b),
  });

describe("PATCH /api/settings — background.textTheme", () => {
  it("defaults to auto", async () => {
    const settings = await (await getSettings()).json();
    expect(settings.background.textTheme).toBe("auto");
  });

  it("accepts light or dark and keeps the rest of the background patch", async () => {
    const res = await patchSettings(
      j({ background: { imageUrl: null, opacity: 40, blur: 5, color: "#000000", textTheme: "dark" } }),
    );
    const settings = await res.json();
    expect(settings.background).toMatchObject({ color: "#000000", opacity: 40, blur: 5, textTheme: "dark" });
  });

  it("falls back to auto for a garbage value rather than storing it", async () => {
    const res = await patchSettings(
      j({ background: { imageUrl: null, opacity: 40, blur: 5, color: "#000000", textTheme: "purple" } }),
    );
    const settings = await res.json();
    expect(settings.background.textTheme).toBe("auto");
  });

  it("requires developer auth", async () => {
    const res = await patchSettings(
      j(
        { background: { imageUrl: null, opacity: 40, blur: 5, color: "#000000", textTheme: "dark" } },
        "ritim_team=1; ritim_actor=Derya|yonetici",
      ),
    );
    expect(res.status).toBe(403);
  });
});
