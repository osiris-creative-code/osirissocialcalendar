import { cookies } from "next/headers";
import { resolveActor } from "@/lib/access/roles";
import { GateForm } from "@/components/team/GateForm";
import { TopBar } from "@/components/team/TopBar";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const hasTeam = jar.get("ritim_team")?.value === "1";
  const isDeveloper = jar.get("ritim_dev")?.value === "1";
  const actor = resolveActor(jar.get("ritim_actor")?.value);

  if (!hasTeam) return <GateForm step="team" />;
  if (!actor) return <GateForm step="role" />;

  return (
    <>
      <TopBar actor={actor} isDeveloper={isDeveloper} />
      <div className="mx-auto max-w-[1120px] px-5 py-8">{children}</div>
    </>
  );
}
