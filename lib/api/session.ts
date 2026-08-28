import { canAddBrand, canArchiveBrand, canEditPlans, resolveActor } from "@/lib/access/roles";
import type { Role } from "@/lib/types";

export type Actor = { name: string; role: Role };

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get("cookie") ?? "";
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function getActor(req: Request): Actor | null {
  return resolveActor(parseCookies(req)["ritim_actor"]);
}
export function hasTeam(req: Request): boolean {
  return parseCookies(req)["ritim_team"] === "1";
}
export function hasDeveloper(req: Request): boolean {
  return parseCookies(req)["ritim_dev"] === "1";
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function cookieHeader(name: string, value: string, maxAgeSec = 60 * 60 * 24 * 30): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

/** 401 when no actor cookie. */
export function requireActor(req: Request): Actor | Response {
  const actor = getActor(req);
  return actor ?? json({ error: "actor required" }, 401);
}

/** 403 when the actor may not edit plans (also covers missing actor). */
export function requireEditor(req: Request): Actor | Response {
  const actor = getActor(req);
  if (!actor || !canEditPlans(actor.role)) return json({ error: "forbidden" }, 403);
  return actor;
}

/** 403 when the actor may not add brands (also covers missing actor). */
export function requireBrandAdder(req: Request): Actor | Response {
  const actor = getActor(req);
  if (!actor || !canAddBrand(actor.role)) return json({ error: "forbidden" }, 403);
  return actor;
}

export function requireBrandArchiver(req: Request): Actor | Response {
  const actor = getActor(req);
  if (!actor || !canArchiveBrand(actor.role)) return json({ error: "forbidden" }, 403);
  return actor;
}
