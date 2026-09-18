import { redirect } from "next/navigation";

import { AnalyticsCenter } from "@/components/admin/analytics/analytics-center";
import { AppShell } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { getAdminAnalytics } from "@/server/admin-analytics";

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const profile = await getActiveProfile();
  if (!profile || profile.role !== "admin") redirect("/");
  const params = await searchParams;
  const period = Array.isArray(params.period) ? params.period[0] : params.period;
  const data = await getAdminAnalytics({ period });
  return <AppShell profile={profile}><PageHeader eyebrow="Administración" title="Analíticas EMS" description="Una vista rápida del rendimiento, actividad y operación del equipo." /><AnalyticsCenter data={data} /></AppShell>;
}
