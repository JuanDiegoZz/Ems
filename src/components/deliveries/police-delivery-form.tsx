"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PersonRecord } from "@/server/people";
import { formatDateTime } from "@/lib/time/date";
import { DAILY_FREE_KIT_QUANTITY, getDailyFreeKitDecision } from "@/lib/deliveries/daily-free-kit";
import { ChoiceDialog } from "@/components/ui/choice-dialog";
import { DocumentViewer } from "@/components/documents/document-viewer";
import { DeliveryPersonPicker } from "./delivery-person-picker";
import { perfTimer } from "@/lib/perf";

const presets = ["5x5", "10x10", "20x20", "40x40"];
type DailyStatus = { enabled: boolean; available: boolean; localDate: string; freeQuantity: string };

export function PoliceDeliveryForm({ rpName, timeZone }: { rpName: string; timeZone: string }) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [selected, setSelected] = useState<PersonRecord | null>(null);
  const [quantity, setQuantity] = useState("10x10");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [delivery, setDelivery] = useState<{ quantity_label: string; occurred_at: string; is_daily_free_kit?: boolean } | null>(null);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const [dailyStatusLoading, setDailyStatusLoading] = useState(false);
  const [chargeWarning, setChargeWarning] = useState<{ title: string; description: string } | null>(null);
  const sequence = useRef(0);
  const submitting = useRef(false);
  const selectedId = selected?.id ?? null;

  async function loadDailyStatus(personId: string, signal?: AbortSignal) {
    const done = perfTimer("daily free kit status");
    try {
      const response = await fetch(`/api/deliveries/police/daily-kit-status?personId=${personId}`, { signal });
      const data = await response.json();
      if (response.ok && !signal?.aborted) setDailyStatus(data as DailyStatus);
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setDailyStatus(null); }
    finally { if (!signal?.aborted) setDailyStatusLoading(false); done(); }
  }

  useEffect(() => {
    const current = ++sequence.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("searching");
      try {
        const response = await fetch(`/api/people?q=${encodeURIComponent(query)}&deliveryType=police`, { signal: controller.signal });
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

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void loadDailyStatus(selectedId, controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [selectedId]);

  async function submit(acceptChargedDailyKit = false) {
    if (!selected || submitting.current) return;
    if (!acceptChargedDailyKit && dailyStatus?.enabled) {
      const decision = getDailyFreeKitDecision(true, quantity, !dailyStatus.available);
      if (decision.warning) { setChargeWarning({ title: dailyStatus.available ? "Kit diario gratuito" : "Kit diario ya entregado", description: decision.warning }); return; }
    }
    submitting.current = true;
    setStatus("sending"); setMessage("");
    const done = perfTimer("confirm police delivery");
    try {
      const response = await fetch("/api/deliveries/police", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ personId: selected.id, quantityLabel: quantity, clientRequestId: crypto.randomUUID(), acceptChargedDailyKit }) });
      const data = await response.json();
      if (response.status === 409 && typeof data.code === "string") { setStatus("idle"); setChargeWarning({ title: "Kit diario ya entregado", description: data.error ?? "Esta entrega sí se cobra." }); return; }
      if (!response.ok) throw new Error(data.error ?? "No se pudo registrar la entrega");
      setDelivery(data); setStatus("success"); setDailyStatusLoading(true); void loadDailyStatus(selected.id);
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "No se pudo registrar la entrega"); }
    finally { submitting.current = false; done(); }
  }

  if (status === "success" && delivery && selected) return <div className="glass-card grid gap-4 p-6"><p className="text-2xl font-bold">Entrega de Kit Policial registrada</p>{delivery.is_daily_free_kit && <p className="text-sm font-semibold text-emerald-300">Kit diario gratuito entregado.</p>}<p><strong>Atendió:</strong> {rpName}</p><p><strong>Policía:</strong> {selected.display_name}</p><p><strong>Placa:</strong> {selected.badge_number}</p><p><strong>Vendajes:</strong> {delivery.quantity_label}</p><p><strong>Fecha:</strong> {formatDateTime(delivery.occurred_at, timeZone)}</p><div className="flex flex-wrap gap-3"><button className="button button-primary" type="button" onClick={() => { setSelected(null); setDailyStatus(null); setDailyStatusLoading(false); setDelivery(null); setStatus("idle"); setQuery(""); }}>Nueva entrega</button><Link className="button button-secondary" href={`/people/${selected.id}`}>Ver policía</Link><Link className="button button-ghost" href="/history">Ir al historial</Link></div></div>;

  return <><DeliveryPersonPicker
    query={query}
    searchPlaceholder="Buscar por nombre o placa"
    onQueryChange={setQuery}
    searching={status === "searching"}
    people={people}
    selected={selected}
    onSelect={(person) => { if (selected?.id === person.id) return; setSelected(person); setDailyStatus(null); setDailyStatusLoading(true); setDelivery(null); setMessage(""); }}
    renderPersonMeta={(person) => <>Policía · Placa {person.badge_number ?? "pendiente"}</>}
    selectedDetails={<><p className="text-sm text-[var(--muted)]">Placa: {selected?.badge_number ?? "pendiente"}</p>{dailyStatusLoading && <p className="text-sm text-[var(--muted)]">Consultando kit gratuito de hoy…</p>}{dailyStatus?.enabled && <p className={`text-sm font-semibold ${dailyStatus.available ? "text-emerald-300" : "text-amber-300"}`}>{dailyStatus.available ? "Kit gratuito de hoy disponible" : "Kit gratuito de hoy ya entregado"}</p>}<div className="flex flex-wrap gap-3">{selected?.ine_path && <DocumentViewer personId={selected.id} personName={selected.display_name} kind="ine" label="Ver INE" />}{selected?.badge_path && <DocumentViewer personId={selected.id} personName={selected.display_name} kind="badge" label="Ver placa" />}</div></>}
    emptyState={<div className="glass-card p-5 text-sm">No encontramos a este policía. <Link className="font-semibold text-blue-300" href="/people/new?type=police&returnTo=/deliveries/police">Registrar nuevo policía</Link></div>}
    selectedForm={selected && <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="grid gap-4"><fieldset><legend className="mb-2 text-sm font-semibold">Cantidad de vendajes</legend><div className="grid grid-cols-4 gap-2">{presets.map((preset) => <button className={`button ${quantity === preset ? "button-primary" : "button-secondary"}`} type="button" key={preset} onClick={() => setQuantity(preset)}>{preset}</button>)}</div><input className="field-input mt-3" value={quantity} onChange={(event) => setQuantity(event.target.value)} maxLength={32} placeholder="Personalizado, ej. 10x10" /></fieldset>{dailyStatus?.enabled && quantity !== DAILY_FREE_KIT_QUANTITY && dailyStatus.available && <p className="text-xs text-amber-200">El kit gratuito diario corresponde a 5x5.</p>}{message && <p className="text-sm text-red-300">{message}</p>}<button className="button button-primary" type="submit" disabled={status === "sending"}>{status === "sending" ? "Registrando…" : "Confirmar entrega"}</button></form>}
  /><ChoiceDialog open={Boolean(chargeWarning)} title={chargeWarning?.title ?? "Kit diario"} description={chargeWarning?.description ?? ""} options={[{ key: "continue", label: "Continuar con entrega", tone: "primary" }, { key: "cancel", label: "Cancelar", tone: "ghost" }]} onClose={() => setChargeWarning(null)} onSelect={(key) => { setChargeWarning(null); if (key === "continue") void submit(true); }} /></>;
}
