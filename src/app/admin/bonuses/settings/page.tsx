import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { BonusSettingsForm } from "@/components/admin/bonuses/bonus-settings-form";
import { PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { getBonusSettings } from "@/server/bonus-runs";

export default async function BonusSettingsPage() {
  const profile = await getActiveProfile();
  if (!profile || profile.role !== "admin") redirect("/");
  const config = await getBonusSettings();
  return <AppShell profile={profile}><PageHeader eyebrow="Administración" title="Configuración de bonos" description="Ajusta metas, pesos y montos antes de calcular una simulación." /><BonusSettingsForm initialSettings={config.settings} initialTiers={config.tiers} /></AppShell>;
}
