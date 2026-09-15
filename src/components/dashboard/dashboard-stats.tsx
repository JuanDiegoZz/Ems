import { formatDateTime } from "@/lib/time/date";
import { loadDashboardStats } from "@/lib/dashboard/stats-state";
import { deliveryStats } from "@/server/deliveries";
import { Card, Icon } from "@/components/ui";

export async function DashboardStats() {
  const result = await loadDashboardStats(deliveryStats);
  if (result.state === "unavailable") return <DashboardStatsUnavailable />;
  const stats = result.value;
  return <section className="mt-8 grid gap-4 sm:grid-cols-3"><Stat icon="heart" label="Entregas de hoy" value={stats.deliveriesToday} /><Stat icon="users" label="Personas registradas" value={stats.activePeople} /><Stat icon="history" label="Última actividad global" value={stats.latest ? formatDateTime(stats.latest.occurred_at) : "Sin actividad"} compact /></section>;
}

function Stat({ icon, label, value, compact = false }: { icon: "heart" | "users" | "history"; label: string; value: string | number; compact?: boolean }) { return <Card><div className="flex items-center justify-between"><p className="text-sm text-[var(--muted)]">{label}</p><Icon name={icon} size={19} /></div><p className={`mt-3 font-bold ${compact ? "text-lg" : "text-3xl"}`}>{value}</p></Card>; }
export function DashboardStatsSkeleton() { return <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Cargando estadísticas">{[0, 1, 2].map((item) => <Card key={item}><div className="h-4 w-32 animate-pulse rounded bg-slate-700/60" /><div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-700/60" /></Card>)}</section>; }
function DashboardStatsUnavailable() { return <section className="mt-8"><p className="text-sm text-[var(--muted)]">Las estadísticas no están disponibles por ahora.</p></section>; }
