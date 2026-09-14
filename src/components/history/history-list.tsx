"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DeliveryView } from "@/server/deliveries";
import { formatDateTime } from "@/lib/time/date";

type Operator = { id: string; rp_name: string };
export function HistoryList({ initial, page, count, operators, timeZone }: { initial: DeliveryView[]; page: number; count: number; operators: Operator[]; timeZone: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const total = Math.max(1, Math.ceil(count / 25));
  const status = (value: string) => value === "sent" ? "Enviado" : value === "failed" ? "Error" : "Pendiente";
  const pageHref = (next: number) => { const value = new URLSearchParams(params); value.set("page", String(next)); return `?${value.toString()}`; };
  function filter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) if (typeof value === "string" && value) next.set(key, value);
    startTransition(() => router.push(`?${next}`));
  }
  return <div className="grid gap-4">
    <form className="glass-card grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6" onSubmit={filter}><input name="personId" type="hidden" value={params.get("personId") ?? ""} /><input name="q" defaultValue={params.get("q") ?? ""} className="field-input lg:col-span-2" placeholder="Persona, placa o EMS" /><select name="emsId" defaultValue={params.get("emsId") ?? ""} className="field-input"><option value="">Todos los EMS</option>{operators.map((operator) => <option value={operator.id} key={operator.id}>{operator.rp_name}</option>)}</select><select name="type" defaultValue={params.get("type") ?? ""} className="field-input"><option value="">Todos</option><option value="civil">Civil</option><option value="police">Policía</option></select><select name="status" defaultValue={params.get("status") ?? ""} className="field-input"><option value="">Todos los estados</option><option value="sent">Enviado</option><option value="pending">Pendiente</option><option value="failed">Errores de Discord</option></select><select name="range" defaultValue={params.get("range") ?? ""} className="field-input"><option value="">Todas las fechas</option><option value="today">Hoy</option><option value="7d">Últimos 7 días</option><option value="30d">Últimos 30 días</option></select><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Cargando…" : "Filtrar"}</button></form>
    {initial.length === 0 ? <div className="glass-card p-8 text-center text-sm text-[var(--muted)]">No hay entregas que coincidan con estos filtros.</div> : <div className="grid gap-3">{initial.map((delivery) => <button className="glass-card card-interactive p-4 text-left" key={delivery.id} type="button" disabled={pending} onClick={() => startTransition(() => router.push(`/history/${delivery.id}`))}><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">{delivery.person?.display_name ?? "Persona no disponible"}</p><p className="text-sm text-[var(--muted)]">{delivery.type === "police" ? `Policía${delivery.person?.badge_number ? ` · Placa ${delivery.person.badge_number}` : ""}` : "Civil"} · {delivery.quantity_label}{delivery.is_daily_free_kit ? " · Kit diario gratuito" : ""}</p><p className="text-xs text-[var(--muted)]">{delivery.profile?.rp_name ?? "EMS no disponible"} · {formatDateTime(delivery.occurred_at, timeZone)}</p></div><span className="badge badge-info">{pending ? "Abriendo…" : status(delivery.status)}</span></div></button>)}</div>}
    <div className="flex items-center justify-between text-sm"><span>Página {page} de {total}</span><div className="flex gap-2">{page > 1 && <a className="button button-secondary" href={pageHref(page - 1)}>Anterior</a>}{page < total && <a className="button button-secondary" href={pageHref(page + 1)}>Siguiente</a>}</div></div>
  </div>;
}
