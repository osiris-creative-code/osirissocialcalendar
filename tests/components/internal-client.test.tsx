import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InternalClient } from "@/app/i/[token]/InternalClient";
import type { Brand, Plan } from "@/lib/types";

const plan = { id: "p", title: "Eylül", stage: "ic_onayda", version: 1 } as Plan;
const brand = {
  id: "b",
  name: "Pablo",
  colorPrimary: "#2E2A26",
  colorAccent: "#C6963C",
  logoUrl: "/demo/ph-1.svg",
} as Brand;

describe("InternalClient", () => {
  it("shows the internal banner and both actions", () => {
    render(<InternalClient plan={plan} brand={brand} items={[]} comments={[]} annotations={[]} />);
    expect(screen.getByText(/İÇ ONAY/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Onayla" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yöneticiye geri gönder" })).toBeInTheDocument();
  });
});
