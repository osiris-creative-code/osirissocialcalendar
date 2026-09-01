import { describe, it, expect } from "vitest";
import { waLink } from "@/lib/whatsapp";

describe("waLink", () => {
  it("omits the path when no phone", () => {
    expect(waLink({ text: "merhaba" })).toBe("https://wa.me/?text=merhaba");
  });

  it("uses digits only from the phone and encodes the text", () => {
    expect(waLink({ phone: "+90 (532) 111 22 33", text: "a b" })).toBe(
      "https://wa.me/905321112233?text=a%20b",
    );
  });

  it("treats a blank phone as no phone", () => {
    expect(waLink({ phone: "   ", text: "x" })).toBe("https://wa.me/?text=x");
  });

  it("throws on empty text", () => {
    expect(() => waLink({ text: "  " })).toThrow();
  });
});
