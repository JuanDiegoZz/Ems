import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { DeliverySettingsPanel } from "@/components/admin/delivery-settings-panel";
import { Card, PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { getDeliverySettings } from "@/server/delivery-settings";

export default async function DeliverySettingsPage() {
  const profile = await getActiveProfile();
  if (!profile || profile.role !== "admin") redirect("/");
  const settings = await getDeliverySettings();
  return <AppShell profile={profile}><PageHeader eyebrow="Administración" title="Configuración de entregas" description="Controla reglas operativas para los kits policiales." /><Card><DeliverySettingsPanel initialEnabled={settings.policeDailyFreeKitEnabled} /></Card></AppShell>;
}
