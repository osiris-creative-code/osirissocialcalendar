import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueueRow } from "@/components/team/QueueRow";
import type { Plan, Role } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const plan = {
  id: "p1",
  brandId: "b1",
  title: "Eylül",
  rangeStart: "2026-09-01",
  rangeEnd: "2026-09-14",
  stage: "revize_istendi",
  reviseDeadline: null,
} as Plan;

const actor = { name: "Derya", role: "yonetici" as Role };

describe("QueueRow", () => {
  it("shows a feedback-count badge when there are pending notes", () => {
    render(<QueueRow plan={plan} brandName="Pablo" actor={actor} feedbackCount={4} />);
    expect(screen.getByText("💬 4 not")).toBeInTheDocument();
  });

  it("shows no badge when there's no feedback yet", () => {
    render(<QueueRow plan={plan} brandName="Pablo" actor={actor} feedbackCount={0} />);
    expect(screen.queryByText(/not$/)).not.toBeInTheDocument();
  });

  it("omits the badge entirely when feedbackCount isn't passed", () => {
    render(<QueueRow plan={plan} brandName="Pablo" actor={actor} />);
    expect(screen.queryByText(/💬/)).not.toBeInTheDocument();
  });
});
