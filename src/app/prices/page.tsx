import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { listPrices } from "@/server/price-catalog";
import { PriceCatalog } from "@/components/prices/price-catalog";

export default async function PricesPage() {
  const profile = await getActiveProfile();
  if (!profile) redirect("/login");
  const prices = await listPrices();
  return <AppShell profile={profile}><PageHeader eyebrow="Operación EMS" title="Precios EMS" description="Consulta rápida de servicios y productos." /><PriceCatalog initialPrices={prices} isAdmin={profile.role === "admin"} /></AppShell>;
}
