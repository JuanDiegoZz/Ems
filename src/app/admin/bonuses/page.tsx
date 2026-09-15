import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { BonusSimulator } from "@/components/admin/bonuses/bonus-simulator";
import { PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { weekRange } from "@/lib/staff-control/calendar";

export default async function BonusesPage() {
  const profile = await getActiveProfile();
  if (!profile || profile.role !== "admin") redirect("/");
  const zone = process.env.APP_TIMEZONE || "America/Monterrey";
  const weekStart = weekRange(new Date(), zone).start.toISOString().slice(0, 10);
  return <AppShell profile={profile}><PageHeader eyebrow="Administración" title="Bonos semanales" description="Simula el rendimiento semanal antes de finalizar los bonos." /><BonusSimulator initialWeekStart={weekStart} /></AppShell>;
}
