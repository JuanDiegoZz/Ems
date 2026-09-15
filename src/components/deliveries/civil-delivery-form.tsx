"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PersonRecord } from "@/server/people";
import { formatDate, formatDateTime } from "@/lib/time/date";
import { DocumentViewer } from "@/components/documents/document-viewer";
import { DeliveryPersonPicker } from "./delivery-person-picker";
import { perfTimer } from "@/lib/perf";
import { deliveryPreselectionMessage } from "@/lib/deliveries/navigation";
import { useToast } from "@/components/feedback/toast-provider";
import { useConnectivity } from "@/components/feedback/connectivity-provider";

const presets = ["5x5", "10x10", "20x20", "40x40"];

export function CivilDeliveryForm({ rpName, timeZone, preselectedPersonId }: { rpName: string; timeZone: string; preselectedPersonId?: string }) {
  const toast = useToast(); const { online } = useConnectivity();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [selected, setSelected] = useState<PersonRecord | null>(null);
  const [quantity, setQuantity] = useState("10x10");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [delivery, setDelivery] = useState<{ quantity_label: string; occurred_at: string } | null>(null);
  const sequence = useRef(0);
  const submitting = useRef(false);
  const [preselectLoading, setPreselectLoading] = useState(Boolean(preselectedPersonId));
  const [preselectNotice, setPreselectNotice] = useState("");

  useEffect(() => {
    if (!preselectedPersonId) return;
    const controller = new AbortController();
    fetch(`/api/people/${preselectedPersonId}?deliveryType=civil`, { signal: controller.signal }).then(async (response) => {
      const data = await response.json() as { person?: PersonRecord; reason?: "archived" | "ineligible" | "not-found" };
      if (controller.signal.aborted) return;
      if (response.ok && data.person) setSelected(data.person);
      else setPreselectNotice(deliveryPreselectionMessage(data.reason ?? "not-found", "civil"));
    }).catch(() => { if (!controller.signal.aborted) setPreselectNotice("No se pudo cargar la persona."); }).finally(() => { if (!controller.signal.aborted) setPreselectLoading(false); });
    return () => controller.abort();
  }, [preselectedPersonId]);

  useEffect(() => {
    if (preselectLoading) return;
    const current = ++sequence.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("searching");
      try {
        const response = await fetch(`/api/people?q=${encodeURIComponent(query)}&deliveryType=civil`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo buscar");
        if (current === sequence.current) { setPeople(data as PersonRecord[]); setStatus("idle"); }
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        if (current === sequence.current) { setStatus("error"); setMessage(caught instanceof Error ? caught.message : "No se pudo buscar"); }
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [preselectLoading, query]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || submitting.current) return;
    if (!online) { const offline = "No hay conexión. Intenta nuevamente cuando recuperes internet."; setMessage(offline); toast.error(offline); return; }
    submitting.current = true;
    setStatus("sending");
    setMessage("");
    const done = perfTimer("confirm civil delivery");
    try {
      const response = await fetch("/api/deliveries/civil", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ personId: selected.id, quantityLabel: quantity, clientRequestId: crypto.randomUUID() }) });
      const data = await response.json();
      if (!response.ok) { setStatus("error"); setMessage(data.error ?? "No se pudo registrar la entrega"); return; }
      setDelivery(data); setStatus("success"); toast.success("Entrega completada.");
    } catch { const failure = "No se pudo conectar con el servidor. Intenta de nuevo."; setStatus("error"); setMessage(failure); toast.error(failure); }
    finally { submitting.current = false; done(); }
  }

  if (status === "success" && delivery && selected) return <div className="glass-card grid gap-4 p-6"><p className="text-2xl font-bold">Entrega registrada</p><p><strong>Civil:</strong> {selected.display_name}</p><p><strong>Vendajes:</strong> {delivery.quantity_label}</p><p><strong>Atendió:</strong> {rpName}</p><p><strong>Fecha:</strong> {formatDateTime(delivery.occurred_at, timeZone)}</p><div className="flex flex-wrap gap-3"><button className="button button-primary" type="button" onClick={() => { setSelected(null); setDelivery(null); setStatus("idle"); setQuery(""); }}>Nueva entrega</button><Link className="button button-secondary" href={`/people/${selected.id}`}>Ver persona</Link><Link className="button button-ghost" href="/history">Ir al historial</Link></div></div>;

  if (preselectLoading) return <div className="glass-card p-6 text-sm text-[var(--muted)]" aria-live="polite">Cargando persona…</div>;

  return <>{preselectNotice && <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100" role="status">{preselectNotice}</p>}<DeliveryPersonPicker
    query={query}
    searchPlaceholder="Buscar civil por nombre o apellido"
    onQueryChange={setQuery}
    searching={status === "searching"}
    people={people}
    selected={selected}
    onSelect={setSelected}
    renderPersonMeta={(person) => <>Civil · INE disponible · Registrado {formatDate(person.created_at, timeZone)}</>}
    selectedDetails={<p className="text-sm text-[var(--muted)]">INE disponible · <DocumentViewer personId={selected?.id ?? ""} personName={selected?.display_name ?? ""} kind="ine" label="Ver INE" /></p>}
    emptyState={<div className="glass-card grid gap-3 p-5 text-sm"><p>No encontramos a {query}.</p><Link className="button button-primary w-fit" href={`/people/new?type=civil&returnTo=/deliveries/civil&searchHint=${encodeURIComponent(query)}`}>+ Registrar nuevo civil</Link></div>}
    selectedForm={selected && <form onSubmit={submit} className="grid gap-4"><fieldset><legend className="mb-2 text-sm font-semibold">Cantidad de vendajes</legend><div className="grid grid-cols-4 gap-2">{presets.map((preset) => <button className={`button ${quantity === preset ? "button-primary" : "button-secondary"}`} type="button" key={preset} onClick={() => setQuantity(preset)}>{preset}</button>)}</div><input className="field-input mt-3" value={quantity} onChange={(event) => setQuantity(event.target.value)} maxLength={32} placeholder="Personalizado, ej. 10x10" /></fieldset>{message && <p className="text-sm text-red-300">{message}</p>}<button className="button button-primary" type="submit" aria-busy={status === "sending"} disabled={status === "sending"}>{status === "sending" ? "Procesando entrega…" : "Confirmar entrega"}</button></form>}
  /></>;
}
