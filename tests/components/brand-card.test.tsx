import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrandCard } from "@/components/team/BrandCard";
import type { Brand } from "@/lib/types";

describe("BrandCard", () => {
  it("renders the brand and fires onOpen", () => {
    const onOpen = vi.fn();
    const brand = {
      id: "b",
      name: "Elit Bakery",
      logoUrl: "/demo/ph-1.svg",
      instagramHandle: "elitbakery",
      colorPrimary: "#7A4A2B",
      colorAccent: "#D9982F",
      status: "active",
      createdByName: "seed",
      createdAt: "2026-08-28T00:00:00Z",
    } as Brand;

    render(<BrandCard brand={brand} onOpen={onOpen} />);
    fireEvent.click(screen.getByText("Elit Bakery"));
    expect(onOpen).toHaveBeenCalledWith("b");
  });
});
