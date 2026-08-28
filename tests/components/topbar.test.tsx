import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopBar } from "@/components/team/TopBar";

describe("TopBar", () => {
  it("hides the Developer tab for a non-developer", () => {
    render(<TopBar actor={{ name: "Derya", role: "yonetici" }} isDeveloper={false} />);
    expect(screen.getByText("Markalar")).toBeInTheDocument();
    expect(screen.queryByText("Developer")).toBeNull();
  });

  it("shows the Developer tab when unlocked", () => {
    render(<TopBar actor={{ name: "Kaan", role: "developer" }} isDeveloper={true} />);
    expect(screen.getByText("Developer")).toBeInTheDocument();
  });
});
