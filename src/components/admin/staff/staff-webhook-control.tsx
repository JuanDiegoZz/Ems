"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/feedback/toast-provider";

export function StaffWebhookControl({ profileId, configured, onSaved }: { profileId: string; configured: boolean; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => { if (!open) return; inputRef.current?.focus(); const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) setOpen(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [open, busy]);
  async function submit(action: "save" | "delete", value?: string) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${profileId}/webhook`, { method: action === "delete" ? "DELETE" : "PATCH", headers: action === "save" ? { "content-type": "application/json" } : undefined, body: action === "save" ? JSON.stringify({ webhookUrl: value }) : undefined });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "No se pudo actualizar el webhook");
      toast.success(action === "save" ? "Webhook de bitácora configurado." : "Webhook de bitácora eliminado.");
      setOpen(false);
      onSaved?.();
      if (!onSaved) router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo actualizar el webhook"); } finally { setBusy(false); }
  }
  return <>
    <div className="staff-webhook-status" aria-label={`Bitácora Discord ${configured ? "configurada" : "sin configurar"}`}><span>Bitácora Discord</span><strong className={configured ? "positive" : "negative"}>{configured ? "✓ Configurada" : "⚠ Sin configurar"}</strong></div>
    <button className="button button-ghost staff-webhook-action" type="button" onClick={() => setOpen(true)}>{configured ? "Cambiar webhook" : "Configurar webhook"}</button>
    {open && <div className="staff-dialog-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}><section className="glass-card staff-dialog" role="dialog" aria-modal="true" aria-labelledby="staff-webhook-title"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Configuración operacional</p><h2 id="staff-webhook-title">Webhook de bitácora</h2></div><button className="button button-ghost" type="button" disabled={busy} onClick={() => setOpen(false)}>Cerrar</button></div><label className="field mt-5">URL del webhook<input ref={inputRef} className="field-input" type="url" autoComplete="off" placeholder="https://discord.com/api/webhooks/..." required={true} disabled={busy} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void submit("save", event.currentTarget.value); } }} /></label><p className="mt-3 text-sm text-[var(--muted)]">Se cifra en el servidor y nunca se vuelve a mostrar.</p><div className="mt-5 flex flex-wrap gap-3"><button className="button button-secondary" type="button" disabled={busy} onClick={() => { const value = inputRef.current?.value.trim() ?? ""; if (!value) { inputRef.current?.focus(); return; } void submit("save", value); }}>{busy ? "Guardando…" : "Guardar"}</button>{configured && <button className="button button-danger" type="button" disabled={busy} onClick={() => void submit("delete")}>{busy ? "Guardando…" : "Eliminar configuración"}</button>}</div></section></div>}
  </>;
}
