import { PICKABLE_TEAM_ROLES, serializeActor } from "@/lib/access/roles";
import { cookieHeader, hasDeveloper, json } from "@/lib/api/session";
import type { Role } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { name?: string; role?: Role } | null;
  const name = body?.name?.trim();
  const role = body?.role;
  if (!name || !role || !PICKABLE_TEAM_ROLES.includes(role)) {
    return json({ error: "name and a pickable role required" }, 400);
  }
  if (role === "developer" && !hasDeveloper(req)) {
    return json({ error: "developer şifresi gerekli" }, 403);
  }
  return new Response(null, {
    status: 204,
    headers: { "set-cookie": cookieHeader("ritim_actor", serializeActor(name, role)) },
  });
}
