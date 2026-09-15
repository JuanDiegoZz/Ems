"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { EMPTY_RECENT_PEOPLE, readRecentPeople, subscribeRecentPeople } from "@/lib/people/recent-people";

export function DashboardRecentPeople({ profileId }: { profileId: string }) {
  const subscribe = useCallback((callback: () => void) => subscribeRecentPeople(profileId, callback), [profileId]);
  const snapshot = useCallback(() => readRecentPeople(profileId), [profileId]);
  const people = useSyncExternalStore(subscribe, snapshot, () => EMPTY_RECENT_PEOPLE);
  return <section><div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Acceso rápido</p><h2 className="mt-1 text-xl font-bold">Personas recientes</h2></div><Link className="text-sm font-semibold text-blue-300" href="/people">Ver personas</Link></div>{people.length ? <div className="mt-4 grid gap-3">{people.map((person) => <article className="rounded-xl border border-[var(--border)] bg-slate-900/30 p-3" key={person.id}><p className="font-semibold break-words">{person.displayName}</p><p className="mt-1 text-sm text-[var(--muted)]">{person.type === "police" ? `Policía${person.badgeNumber ? ` · ${person.badgeNumber}` : ""}` : "Civil"}</p><div className="mt-3 flex flex-wrap gap-2 text-sm"><Link className="button button-ghost" href={`/people/${person.id}`}>Ver</Link><Link className="button button-primary" href={`/deliveries/civil?personId=${person.id}`}>Entrega civil</Link>{person.type === "police" && <Link className="button button-secondary" href={`/deliveries/police?personId=${person.id}`}>Policial</Link>}</div></article>)}</div> : <p className="mt-4 text-sm text-[var(--muted)]">Las personas que abras aparecerán aquí durante esta sesión.</p>}</section>;
}
