import { newId } from "@/lib/ids";
import type { DbShape } from "./store";

/** Initial contents written to db.json on first run. Two demo brands, no plans. */
export function seedData(): DbShape {
  const now = new Date().toISOString();

  const elit = {
    id: newId(),
    name: "Elit Bakery",
    logoUrl: "/demo/ph-1.svg",
    colorPrimary: "#7A4A2B",
    colorAccent: "#D9982F",
    instagramHandle: "elitbakery",
    status: "active" as const,
    createdByName: "seed",
    createdAt: now,
  };
  const pablo = {
    id: newId(),
    name: "Pablo",
    logoUrl: "/demo/ph-3.svg",
    colorPrimary: "#2E2A26",
    colorAccent: "#C6963C",
    instagramHandle: "pablo",
    status: "active" as const,
    createdByName: "seed",
    createdAt: now,
  };

  const sources = [elit, pablo].flatMap((b) => [
    {
      id: newId(),
      brandId: b.id,
      kind: "drive_oauth" as const,
      label: "Google Drive · bağlı",
      config: { folder: `${b.name.toUpperCase()}-EYLUL` },
    },
    {
      id: newId(),
      brandId: b.id,
      kind: "manual" as const,
      label: "Manuel yükleme",
      config: {},
    },
  ]);

  return {
    brands: [elit, pablo],
    sources,
    plans: [],
    items: [],
    assets: [],
    versions: [],
    comments: [],
    annotations: [],
    activity: [],
  };
}
