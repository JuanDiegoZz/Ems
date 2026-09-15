"use client";

import { useState } from "react";
import { useToast } from "@/components/feedback/toast-provider";
import { useConnectivity } from "@/components/feedback/connectivity-provider";

export function DeliverySettingsPanel({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  const toast = useToast(); const { online } = useConnectivity();
  async function update(next: boolean) {
    if (saving) return;
    if (!online) { const offline = "No hay conexión. Intenta nuevamente cuando recuperes internet."; setMessage(offline); toast.error(offline); return; }
    setSaving(true); setMessage("");
    try { const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ policeDailyFreeKitEnabled: next }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la configuración"); setEnabled(data.policeDailyFreeKitEnabled); setMessage("Configuración guardada."); toast.success("Configuración guardada."); }
    catch (error) { const failure = error instanceof Error ? error.message : "No se pudo guardar la configuración."; setMessage(failure); toast.error(failure); }
    finally { setSaving(false); }
  }
  return <div className="grid gap-4"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold">Primer kit policial del día gratis</p><p className="mt-1 text-sm text-[var(--muted)]">Permite un kit 5x5 gratuito por oficial cada día. Se reinicia a las 12:00 AM en America/Monterrey.</p></div><button className={`button ${enabled ? "button-primary" : "button-secondary"}`} type="button" disabled={saving} aria-busy={saving} aria-pressed={enabled} onClick={() => update(!enabled)}>{saving ? "Guardando…" : enabled ? "Activado" : "Desactivado"}</button></div>{message && <p className={`text-sm ${message === "Configuración guardada." ? "text-emerald-300" : "text-red-300"}`}>{message}</p>}</div>;
}
