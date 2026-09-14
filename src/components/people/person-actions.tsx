"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PersonActionsProps = { id: string; personName: string; archived: boolean; isAdmin: boolean; deliveryCount: number; showArchive?: boolean; showDelete?: boolean };

export function PersonActions({ id, personName, archived, isAdmin, deliveryCount, showArchive = true, showDelete = true }: PersonActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [relatedCount, setRelatedCount] = useState(deliveryCount);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  async function archive() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/people/${id}/archive`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ archived: !archived }) });
      if (!response.ok) throw new Error("No se pudo actualizar el archivo de la persona");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo actualizar la persona");
    } finally {
      setBusy(false);
    }
  }

  function openDelete() {
    setStep(1);
    setRelatedCount(deliveryCount);
    setConfirmation("");
    setError("");
    setOpen(true);
  }

  async function deletePermanently() {
    if (confirmation !== personName) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/people/${id}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ forceDeleteRelated: step === 2 }) });
      const data = await response.json().catch(() => null) as { error?: string; requiresForce?: boolean; deliveryCount?: number } | null;
      if (response.status === 409 && data?.requiresForce) {
        setRelatedCount(data.deliveryCount ?? deliveryCount);
        setStep(2);
        setConfirmation("");
        return;
      }
      if (!response.ok) throw new Error(data?.error ?? "No se pudo eliminar la persona");
      router.replace("/people");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar la persona");
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex flex-wrap gap-3">
    {showArchive && <button className="button button-secondary" type="button" onClick={archive} disabled={busy}>{busy ? "Procesando…" : archived ? "Restaurar" : "Archivar"}</button>}
    {isAdmin && showDelete && <button className="button button-danger" type="button" onClick={openDelete} disabled={busy}>{busy ? "Procesando…" : "Eliminar definitivamente"}</button>}
    {error && <p className="form-error basis-full" role="alert">{error}</p>}
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="glass-card w-full max-w-lg" role="dialog" aria-modal="true" aria-labelledby="delete-person-title">
        <h2 id="delete-person-title" className="text-xl font-bold">Eliminar definitivamente a {personName}</h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">Esta acción no se puede deshacer.</p>
        {relatedCount > 0 && <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">Esta persona tiene {relatedCount} entregas registradas. La eliminación forzada también eliminará esas entregas.</p>}
        {step === 2 && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">Confirma por segunda vez para eliminar la persona y sus entregas relacionadas.</p>}
        <label className="field mt-5">Para confirmar, escribe: <strong>{personName}</strong><input className="field-input" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoFocus /></label>
        <div className="mt-5 flex justify-end gap-3"><button className="button button-secondary" type="button" onClick={() => setOpen(false)} disabled={busy}>Cancelar</button><button className="button button-danger" type="button" disabled={busy || confirmation !== personName} onClick={deletePermanently}>{busy ? "Eliminando…" : step === 2 ? "Eliminar definitivamente" : relatedCount > 0 ? "Continuar" : "Eliminar definitivamente"}</button></div>
      </div>
    </div>}
  </div>;
}
