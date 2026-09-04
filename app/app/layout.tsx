import { cookies } from "next/headers";
import { resolveActor } from "@/lib/access/roles";
import { getStore } from "@/lib/db";
import { AppBackground } from "@/components/team/AppBackground";
import { GateForm } from "@/components/team/GateForm";
import { TopBar } from "@/components/team/TopBar";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const hasTeam = jar.get("ritim_team")?.value === "1";
  const isDeveloper = jar.get("ritim_dev")?.value === "1";
  const actor = resolveActor(jar.get("ritim_actor")?.value);

  if (!hasTeam) return <GateForm step="team" />;
  if (!actor) return <GateForm step="role" />;

  const settings = await getStore().getSettings();

  return (
    <>
      <AppBackground background={settings.background} />
      <TopBar actor={actor} isDeveloper={isDeveloper} logoUrl={settings.logoUrl} />
      <div className="relative mx-auto max-w-[1120px] px-5 py-8">{children}</div>
    </>
  );
}
