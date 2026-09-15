import Link from "next/link";
import { formatDateTime } from "@/lib/time/date";
import { listMyRecentDeliveries } from "@/server/deliveries";

export async function DashboardRecentActivity() {
  const activity = await listMyRecentDeliveries();
  return <section><div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Tu actividad</p><h2 className="mt-1 text-xl font-bold">Actividad reciente</h2></div><Link className="text-sm font-semibold text-blue-300" href="/history">Ver historial</Link></div>{activity.length ? <div className="mt-4 grid gap-3">{activity.map((delivery) => <Link className="card-interactive rounded-xl border border-[var(--border)] bg-slate-900/30 p-3" href={`/history/${delivery.id}`} key={delivery.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{delivery.person?.display_name ?? "Persona no disponible"}</p><p className="mt-1 text-sm text-[var(--muted)]">{delivery.type === "police" ? "Policía" : "Civil"} · {delivery.quantity_label}</p></div><time className="shrink-0 text-sm text-[var(--muted)]">{formatDateTime(delivery.occurred_at)}</time></div></Link>)}</div> : <p className="mt-4 text-sm text-[var(--muted)]">Aún no has registrado entregas.</p>}</section>;
}

export function DashboardActivitySkeleton() {
  return <section aria-label="Cargando actividad reciente"><p className="eyebrow">Tu actividad</p><h2 className="mt-1 text-xl font-bold">Actividad reciente</h2><div className="mt-4 grid gap-3">{[0, 1, 2].map((item) => <div className="h-[72px] animate-pulse rounded-xl bg-slate-800/60" key={item} />)}</div></section>;
}
