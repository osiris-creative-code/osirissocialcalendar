import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/brands/route";

function req(method: string, body?: unknown, cookies = "") {
  return new Request("http://t/api/brands", {
    method,
    headers: { "content-type": "application/json", cookie: cookies },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("/api/brands", () => {
  it("GET returns seeded brands", async () => {
    const res = await GET(req("GET"));
    const brands = await res.json();
    expect(brands.length).toBeGreaterThanOrEqual(2);
  });

  it("POST without an editor actor is 403", async () => {
    const res = await POST(req("POST", { name: "X", colorPrimary: "#000", colorAccent: "#111" }));
    expect(res.status).toBe(403);
  });

  it("POST as onaylayan (cannot add brands) is 403", async () => {
    const res = await POST(
      req("POST", { name: "X", colorPrimary: "#000", colorAccent: "#111" }, "ritim_actor=A|onaylayan"),
    );
    expect(res.status).toBe(403);
  });

  it("POST as yönetici creates a brand", async () => {
    const res = await POST(
      req(
        "POST",
        { name: "Deniz Cafe", colorPrimary: "#4C7A3F", colorAccent: "#B7C24A" },
        "ritim_team=1; ritim_actor=Derya|yonetici",
      ),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Deniz Cafe");
  });
});
