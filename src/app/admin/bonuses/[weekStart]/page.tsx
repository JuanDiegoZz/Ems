import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { BonusSimulator } from "@/components/admin/bonuses/bonus-simulator";
import { PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { StaffControlError } from "@/server/staff-control";
import { getBonusRun } from "@/server/bonus-runs";

export default async function BonusWeekPage({ params }: { params: Promise<{ weekStart: string }> }) {
  const profile = await getActiveProfile();
  if (!profile || profile.role !== "admin") redirect("/");
  const { weekStart } = await params;
  let data;
  try {
    data = await getBonusRun(weekStart);
  } catch (error) {
    if (error instanceof StaffControlError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  return <AppShell profile={profile}><PageHeader eyebrow="Histórico de bonos" title={`Semana ${data.weekStart}`} description="Resultados, métricas y configuración congelados de esta semana." /><BonusSimulator initialWeekStart={data.weekStart} initialData={data} /></AppShell>;
}
