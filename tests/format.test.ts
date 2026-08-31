import { describe, it, expect } from "vitest";
import { deadlineLabel } from "@/lib/format";

const now = new Date("2026-09-10T09:00:00Z");

describe("deadlineLabel", () => {
  it("counts days remaining", () => {
    expect(deadlineLabel("2026-09-12", now)).toEqual({
      text: "Son gün: 12 Eylül · 2 gün kaldı",
      overdue: false,
    });
  });
  it("marks today and tomorrow", () => {
    expect(deadlineLabel("2026-09-10", now).text).toMatch(/bugün/);
    expect(deadlineLabel("2026-09-11", now).text).toMatch(/yarın/);
  });
  it("flags overdue", () => {
    const r = deadlineLabel("2026-09-08", now);
    expect(r.overdue).toBe(true);
    expect(r.text).toMatch(/Süre doldu/);
  });
});
