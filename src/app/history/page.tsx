import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/ui";
import { getActiveProfile } from "@/lib/auth/session";
import { startOfDayInTimeZone } from "@/lib/time/date";
import { listDeliveries, listDeliveryOperators } from "@/server/deliveries";
import { HistoryList } from "@/components/history/history-list";
export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) { const profile = await getActiveProfile(); if (!profile) redirect("/login"); const params = await searchParams; const range = params.range; const today = startOfDayInTimeZone(); const start = range === "today" ? today : range === "7d" ? new Date(today.getTime() - 6 * 86400000) : range === "30d" ? new Date(today.getTime() - 29 * 86400000) : undefined; const [result, operators] = await Promise.all([listDeliveries({ q: params.q, type: params.type, status: params.status, personId: params.personId, emsId: params.emsId, from: start?.toISOString(), page: Number(params.page) || 1 }), listDeliveryOperators()]); return <AppShell profile={profile}><PageHeader eyebrow="Historial" title="Entregas" description="Consulta entregas, estados de Discord y actividad del hospital." /><HistoryList initial={result.data} page={result.page} count={result.count} operators={operators} timeZone={process.env.APP_TIMEZONE || "America/Monterrey"} /></AppShell>; }




