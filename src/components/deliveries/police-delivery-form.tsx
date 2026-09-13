"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PersonRecord } from "@/server/people";
import { formatDateTime } from "@/lib/time/date";
import { DocumentViewer } from "@/components/documents/document-viewer";

const presets = ["5x5", "10x10", "20x20", "40x40"];

export function PoliceDeliveryForm({ rpName, timeZone }: { rpName: string; timeZone: string }) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [selected, setSelected] = useState<PersonRecord | null>(null);
  const [quantity, setQuantity] = useState("10x10");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [delivery, setDelivery] = useState<{ quantity_label: string; occurred_at: string } | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    const current = ++sequence.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("searching");
      try {
        const response = await fetch(`/api/people?q=${encodeURIComponent(query)}&type=police`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo buscar");
        if (current === sequence.current) { setPeople(data as PersonRecord[]); setStatus("idle"); }
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        if (current === sequence.current) { setStatus("error"); setMessage(caught instanceof Error ? caught.message : "No se pudo buscar"); }
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setStatus("sending");
    setMessage("");
    const response = await fetch("/api/deliveries/police", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ personId: selected.id, quantityLabel: quantity, clientRequestId: crypto.randomUUID() }) });
    const data = await response.json();
    if (!response.ok) { setStatus("error"); setMessage(data.error ?? "No se pudo registrar la entrega"); return; }
    setDelivery(data); setStatus("success");
  }

  if (status === "success" && delivery && selected) return <div className="glass-card grid gap-4 p-6"><p className="text-2xl font-bold">Entrega de Kit Policial registrada</p><p><strong>Atendió:</strong> {rpName}</p><p><strong>Policía:</strong> {selected.display_name}</p><p><strong>Placa:</strong> {selected.badge_number}</p><p><strong>Vendajes:</strong> {delivery.quantity_label}</p><p><strong>Fecha:</strong> {formatDateTime(delivery.occurred_at, timeZone)}</p><div className="flex flex-wrap gap-3"><button className="button button-primary" type="button" onClick={() => { setSelected(null); setDelivery(null); setStatus("idle"); setQuery(""); }}>Nueva entrega</button><Link className="button button-secondary" href={`/people/${selected.id}`}>Ver policía</Link><Link className="button button-ghost" href="/history">Ir al historial</Link></div></div>;

  return <div className="grid gap-5"><div className="glass-card grid gap-2 p-4"><input className="field-input" placeholder="Buscar por nombre o placa" value={query} onChange={(event) => setQuery(event.target.value)} />{status === "searching" && <p className="text-xs text-[var(--muted)]">Buscando…</p>}</div>{people.length > 0 && <div className="grid gap-3">{people.map((person) => <button className={`glass-card p-4 text-left ${selected?.id === person.id ? "ring-2 ring-blue-500" : ""}`} type="button" key={person.id} onClick={() => setSelected(person)}><p className="font-semibold">{person.display_name}</p><p className="text-sm text-[var(--muted)]">Policía · Placa {person.badge_number ?? "pendiente"}</p></button>)}</div>}{people.length === 0 && query && status !== "searching" && <div className="glass-card p-5 text-sm">No encontramos a este policía. <Link className="font-semibold text-blue-300" href="/people/new?type=police&returnTo=/deliveries/police">Registrar nuevo policía</Link></div>}{selected && <form onSubmit={submit} className="glass-card grid gap-4 p-6"><div><p className="text-sm text-[var(--muted)]">Policía seleccionado</p><p className="text-xl font-semibold">{selected.display_name}</p><p className="text-sm text-[var(--muted)]">Placa: {selected.badge_number ?? "pendiente"}</p><div className="mt-2 flex flex-wrap gap-3">{selected.ine_path && <DocumentViewer personId={selected.id} personName={selected.display_name} kind="ine" label="Ver INE" />}{selected.badge_path && <DocumentViewer personId={selected.id} personName={selected.display_name} kind="badge" label="Ver placa" />}</div></div><fieldset><legend className="mb-2 text-sm font-semibold">Cantidad de vendajes</legend><div className="grid grid-cols-4 gap-2">{presets.map((preset) => <button className={`button ${quantity === preset ? "button-primary" : "button-secondary"}`} type="button" key={preset} onClick={() => setQuantity(preset)}>{preset}</button>)}</div><input className="field-input mt-3" value={quantity} onChange={(event) => setQuantity(event.target.value)} maxLength={32} placeholder="Personalizado, ej. 10x10" /></fieldset>{message && <p className="text-sm text-red-300">{message}</p>}<button className="button button-primary" type="submit" disabled={status === "sending"}>{status === "sending" ? "Registrando…" : "Registrar entrega"}</button></form>}</div>;
}
