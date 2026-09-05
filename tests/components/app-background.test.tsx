import { describe, it, expect, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { AppBackground } from "@/components/team/AppBackground";
import type { BackgroundSettings } from "@/lib/types";

const base: BackgroundSettings = { imageUrl: null, opacity: 35, blur: 8, color: "#1b1714" };

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
});

describe("AppBackground — pinning text theme so it stays readable", () => {
  it("leaves data-theme alone when textTheme is auto (or absent)", () => {
    render(<AppBackground background={base} />);
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("forces dark text-theme for a dark background", () => {
    render(<AppBackground background={{ ...base, color: "#000000", textTheme: "dark" }} />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("forces light text-theme for a light background", () => {
    render(<AppBackground background={{ ...base, color: "#ffffff", textTheme: "light" }} />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
