import { describe, it, expect } from "vitest";
import { visionSafeUrl } from "@/lib/ai/vision-safe";

describe("visionSafeUrl", () => {
  it("passes a normal https url through", () => {
    expect(visionSafeUrl("https://xyz.supabase.co/storage/v1/object/public/osiris/a.jpg")).toBe(
      "https://xyz.supabase.co/storage/v1/object/public/osiris/a.jpg",
    );
  });
  it("drops Drive-hosted fallback urls", () => {
    expect(visionSafeUrl("https://lh3.googleusercontent.com/d/abc123=w2000")).toBeNull();
    expect(visionSafeUrl("https://drive.google.com/file/d/abc123/preview")).toBeNull();
  });
  it("drops null/empty/non-https", () => {
    expect(visionSafeUrl(null)).toBeNull();
    expect(visionSafeUrl(undefined)).toBeNull();
    expect(visionSafeUrl("")).toBeNull();
    expect(visionSafeUrl("/demo/ph-1.svg")).toBeNull();
    expect(visionSafeUrl("http://insecure.example/a.jpg")).toBeNull();
  });
});
