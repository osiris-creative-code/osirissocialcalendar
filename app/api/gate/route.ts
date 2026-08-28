import { checkDeveloperPassword, checkTeamToken } from "@/lib/access/gate";
import { cookieHeader, json } from "@/lib/api/session";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { kind?: string; value?: string } | null;
  if (!body?.kind || typeof body.value !== "string") {
    return json({ error: "kind and value required" }, 400);
  }

  if (body.kind === "team") {
    if (!checkTeamToken(body.value)) return json({ error: "geçersiz ekip kodu" }, 401);
    return new Response(null, { status: 204, headers: { "set-cookie": cookieHeader("ritim_team", "1") } });
  }
  if (body.kind === "developer") {
    if (!checkDeveloperPassword(body.value)) return json({ error: "geçersiz şifre" }, 401);
    return new Response(null, { status: 204, headers: { "set-cookie": cookieHeader("ritim_dev", "1") } });
  }
  return json({ error: "unknown kind" }, 400);
}
