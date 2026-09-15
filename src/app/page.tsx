import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { DashboardActivitySkeleton, DashboardRecentActivity } from "@/components/dashboard/recent-activity";
import { DashboardRecentPeople } from "@/components/dashboard/recent-people";
import { DashboardShiftStatus } from "@/components/dashboard/shift-status";
import { DashboardStats, DashboardStatsSkeleton } from "@/components/dashboard/dashboard-stats";
import { DashboardWarmup } from "@/components/dashboard/dashboard-warmup";
import { Badge, Button, PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";

export default async function Home() {
  const profile = await getActiveProfile();
  if (!profile) redirect("/login");
  return <AppShell profile={profile}><PageHeader eyebrow="Centro operativo" title={`Hola, ${profile.rp_name}`} description="Atiende, registra y consulta lo esencial sin salir del ritmo." action={<Badge tone="info">{profile.role === "admin" ? "Administrador" : "EMS"}</Badge>} /><section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_1.35fr]"><DashboardShiftStatus /><section className="glass-card"><p className="eyebrow">Acciones rápidas</p><h2 className="mt-2 text-xl font-bold">¿Qué necesitas hacer?</h2><div className="mt-5 grid gap-3 sm:grid-cols-3"><Button href="/deliveries/civil" icon="heart">Entrega civil</Button><Button href="/deliveries/police" variant="secondary" icon="shield">Entrega policial</Button><Button href="/people/new" variant="ghost" icon="plus">Registrar persona</Button></div></section></section><section className="mt-7 grid gap-7 lg:grid-cols-2"><DashboardRecentPeople profileId={profile.id} /><Suspense fallback={<DashboardActivitySkeleton />}><DashboardRecentActivity /></Suspense></section><Suspense fallback={<DashboardStatsSkeleton />}><DashboardStats /></Suspense><DashboardWarmup role={profile.role} /></AppShell>;
}
