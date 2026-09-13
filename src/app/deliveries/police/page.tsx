import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { PoliceDeliveryForm } from "@/components/deliveries/police-delivery-form";
export default async function PoliceDeliveryPage() { const profile = await getActiveProfile(); if (!profile) redirect("/login"); return <AppShell profile={profile}><PageHeader eyebrow="Entrega policial" title="Kit Policial" description="Busca una placa y registra los vendajes entregados." /><PoliceDeliveryForm rpName={profile.rp_name} timeZone={process.env.APP_TIMEZONE || "America/Monterrey"} /></AppShell>; }





