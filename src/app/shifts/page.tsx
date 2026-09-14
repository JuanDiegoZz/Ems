import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { getCurrentShift } from "@/server/shifts";
import { ShiftPanel } from "@/components/shifts/shift-panel";
export default async function ShiftsPage() { const profile = await getActiveProfile(); if (!profile) redirect("/login"); const shift = await getCurrentShift(); return <AppShell profile={profile}><PageHeader eyebrow="Servicio EMS" title="Bitácora" description="Abre y cierra tu turno de servicio. Tu turno continúa aunque cierres sesión." /><ShiftPanel initial={shift} /></AppShell>; }
