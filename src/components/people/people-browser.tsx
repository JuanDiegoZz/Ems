"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PersonRecord } from "@/server/people";
import { Icon } from "@/components/ui";

export function PeopleBrowser({ initial }: { initial: PersonRecord[] }) {
  const [people, setPeople] = useState(initial);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);

  useEffect(() => {
    const currentSequence = ++sequence.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/people?q=${encodeURIComponent(q)}&type=${type}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo buscar");
        if (currentSequence === sequence.current) setPeople(data as PersonRecord[]);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        if (currentSequence === sequence.current) setError(caught instanceof Error ? caught.message : "No se pudo buscar");
      } finally {
        if (currentSequence === sequence.current) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [q, type]);

  return <div className="space-y-6">
    <div className="glass-card grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
      <label className="search-field"><Icon name="search" size={17} /><input aria-label="Buscar personas" placeholder="Nombre, apellido o placa" value={q} onChange={(event) => setQ(event.target.value)} /></label>
      <select className="field-input" value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos</option><option value="civil">Civil</option><option value="police">Policía</option></select>
      {loading && <p className="text-xs text-[var(--muted)]" aria-live="polite">Buscando…</p>}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="grid gap-3">{people.map((person) => <Link className="glass-card card-interactive block p-5" href={`/people/${person.id}`} key={person.id}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[var(--text)]">{person.display_name}</p><p className="text-sm text-[var(--muted)]">{person.type === "police" ? `Policía · Placa ${person.badge_number ?? "pendiente"}` : "Civil"}</p></div><span className="text-xs text-[var(--muted)]">Ver ficha</span></div></Link>)}{people.length === 0 && <div className="glass-card p-8 text-center text-sm text-[var(--muted)]">No hay personas que coincidan.</div>}</div>
    <Link className="button button-primary inline-flex" href="/people/new"><Icon name="plus" size={17} />Registrar persona</Link>
  </div>;
}
