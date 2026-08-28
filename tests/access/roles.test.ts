import { describe, it, expect } from "vitest";
import {
  resolveActor,
  serializeActor,
  canAddBrand,
  canArchiveBrand,
  canEditPlans,
  checkTeamToken,
} from "@/lib/access/roles";
import { checkDeveloperPassword } from "@/lib/access/gate";

describe("actor cookie", () => {
  it("round-trips", () => {
    const s = serializeActor("Derya", "yonetici");
    expect(resolveActor(s)).toEqual({ name: "Derya", role: "yonetici" });
  });
  it("rejects an unknown role", () => {
    expect(resolveActor("Derya|godmode")).toBeNull();
  });
  it("returns null for undefined", () => {
    expect(resolveActor(undefined)).toBeNull();
  });
  it("rejects a name containing a pipe", () => {
    expect(resolveActor("a|b|yonetici")).toBeNull();
  });
});

describe("permissions", () => {
  it("yönetici adds but does not archive brands", () => {
    expect(canAddBrand("yonetici")).toBe(true);
    expect(canArchiveBrand("yonetici")).toBe(false);
  });
  it("developer archives", () => {
    expect(canArchiveBrand("developer")).toBe(true);
  });
  it("onaylayan can edit plans", () => {
    expect(canEditPlans("onaylayan")).toBe(true);
  });
  it("marka can do neither", () => {
    expect(canEditPlans("marka")).toBe(false);
    expect(canAddBrand("marka")).toBe(false);
  });
});

describe("gates", () => {
  it("accept the dev defaults", () => {
    expect(checkTeamToken("ritim-dev")).toBe(true);
    expect(checkTeamToken("nope")).toBe(false);
    expect(checkDeveloperPassword("dev")).toBe(true);
    expect(checkDeveloperPassword("nope")).toBe(false);
  });
});
