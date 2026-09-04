import { ROLES, type Role } from "@/lib/types";

export const ROLE_LABELS: Record<Role, string> = {
  developer: "Geliştirici",
  yonetici: "Sosyal Medya Yöneticisi",
  onaylayan: "In-house onaylayan",
  marka: "Marka",
};

/** Roles a person may pick at the team gate (marka never logs in; developer needs the password). */
export const PICKABLE_TEAM_ROLES: Role[] = ["yonetici", "onaylayan", "developer"];

function isRole(v: string): v is Role {
  return (ROLES as readonly string[]).includes(v);
}

/** Serialize `{name, role}` into the `ritim_actor` cookie value. */
export function serializeActor(name: string, role: Role): string {
  return `${name}|${role}`;
}

/** Parse the `ritim_actor` cookie value; returns null when malformed or unknown role. */
export function resolveActor(cookieValue: string | undefined): { name: string; role: Role } | null {
  if (!cookieValue) return null;
  const idx = cookieValue.lastIndexOf("|");
  if (idx <= 0) return null;
  const name = cookieValue.slice(0, idx);
  const role = cookieValue.slice(idx + 1);
  if (name.includes("|") || !name.trim() || !isRole(role)) return null;
  return { name, role };
}

export function checkTeamToken(input: string): boolean {
  return input === (process.env.OSIRIS_TEAM_TOKEN ?? "osiris-dev");
}

export function checkDeveloperPassword(input: string): boolean {
  return input === (process.env.OSIRIS_DEV_PASSWORD ?? "dev");
}

export function canEditPlans(role: Role): boolean {
  return role === "yonetici" || role === "onaylayan" || role === "developer";
}

export function canAddBrand(role: Role): boolean {
  return role === "yonetici" || role === "developer";
}

export function canArchiveBrand(role: Role): boolean {
  return role === "developer";
}
