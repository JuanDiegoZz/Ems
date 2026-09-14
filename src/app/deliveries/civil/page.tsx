import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { CivilDeliveryForm } from "@/components/deliveries/civil-delivery-form";
export default async function CivilDeliveryPage({ searchParams }: { searchParams: Promise<{ personId?: string }> }) { const profile = await getActiveProfile(); if (!profile) redirect("/login"); const personId = (await searchParams).personId; return <AppShell profile={profile}><PageHeader eyebrow="Entrega civil" title="Kit Civil" description="Busca un civil y registra los vendajes entregados." /><CivilDeliveryForm rpName={profile.rp_name} timeZone={process.env.APP_TIMEZONE || "America/Monterrey"} preselectedPersonId={personId} /></AppShell>; }





