"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonRecord } from "@/server/people";
import { readDniV2 } from "@/lib/people/dni-ocr-v2/index";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { DocumentViewer } from "@/components/documents/document-viewer";
import { BadgeOcrInput } from "./badge-ocr-input";
import { buildDisplayName } from "@/lib/people/display-name";

export function PersonEditForm({ person }: { person: PersonRecord }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(person.first_name);
  const [lastName, setLastName] = useState(person.last_name);
  const [displayName, setDisplayName] = useState(person.display_name);
  const [displayNameManual, setDisplayNameManual] = useState(person.display_name !== `${person.first_name} ${person.last_name}`);
  const [badgeNumber, setBadgeNumber] = useState(person.badge_number ?? "");
  const [manualIdentity, setManualIdentity] = useState({ first: false, last: false });
  const [removeBadge, setRemoveBadge] = useState(false);
  const [ocrMessage, setOcrMessage] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function syncDisplay(nextFirst: string, nextLast: string) {
    if (!displayNameManual) setDisplayName(buildDisplayName(nextFirst, nextLast));
  }

  async function readIne(file: File) {
    setOcrMessage("Leyendo INE…");
    setOcrProgress(0);
    try {
      const result = await readDniV2(file, setOcrProgress);
      if (!manualIdentity.first) setFirstName(result.fields.firstName);
      if (!manualIdentity.last) setLastName(result.fields.lastName);
      if (!displayNameManual) setDisplayName(buildDisplayName(manualIdentity.first ? firstName : result.fields.firstName, manualIdentity.last ? lastName : result.fields.lastName));
      setOcrMessage(result.fields.status === "detected" ? "INE detectada correctamente" : "Detectamos parte de la información. Revisa los campos.");
    } catch {
      setOcrMessage("No se pudo leer la INE. Puedes escribir los datos manualmente.");
    } finally {
      setOcrProgress(0);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/people/${person.id}`, { method: "PATCH", body: new FormData(event.currentTarget) });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "No se pudo actualizar la persona");
        return;
      }
      router.push(`/people/${person.id}`);
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const autoDisplay = buildDisplayName(firstName, lastName);
  return <form onSubmit={submit} className="glass-card grid gap-5 p-6">
    <h1 className="text-2xl font-bold">Editar persona</h1>
    {person.type === "police" && <p className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3 text-sm text-[var(--text-secondary)]">Completa cualquier dato faltante de este policía. Puedes guardar con al menos una identificación.</p>}
    <div className="grid gap-4 sm:grid-cols-2"><label className="field">Nombre<input required name="firstName" value={firstName} onChange={(event) => { const value = event.target.value; setFirstName(value); setManualIdentity((state) => ({ ...state, first: true })); syncDisplay(value, lastName); }} className="field-input" /></label><label className="field">Apellido<input required name="lastName" value={lastName} onChange={(event) => { const value = event.target.value; setLastName(value); setManualIdentity((state) => ({ ...state, last: true })); syncDisplay(firstName, value); }} className="field-input" /></label></div>
    <label className="field">Nombre visible<input required name="displayName" value={displayName} onChange={(event) => { setDisplayName(event.target.value); setDisplayNameManual(true); }} className="field-input" /></label>
    {displayNameManual && <button className="button button-ghost justify-self-start text-sm" type="button" onClick={() => { setDisplayNameManual(false); setDisplayName(autoDisplay); }}>Restablecer automático</button>}
    {person.ine_path && <div className="grid gap-2"><span className="field">INE actual</span><DocumentViewer personId={person.id} personName={person.display_name} kind="ine" label="Ver INE completa" /></div>}
    <UploadDropzone name="ine" label={person.ine_path ? "Cambiar INE" : "Subir INE"} onFile={readIne} />
    {ocrMessage && <p className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-sm text-[var(--text-secondary)]" aria-live="polite">{ocrMessage}{ocrProgress > 0 && ` ${ocrProgress}%`}</p>}
    {person.type === "police" && <><label className="field">Número de placa<input name="badgeNumber" value={badgeNumber} onChange={(event) => setBadgeNumber(event.target.value)} className="field-input" placeholder="Número de placa" /></label>{person.badge_path && <div className="grid gap-2"><span className="field">Placa actual</span><DocumentViewer personId={person.id} personName={person.display_name} kind="badge" label="Ver placa completa" /></div>}<BadgeOcrInput onDetected={setBadgeNumber} /><label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><input type="checkbox" name="removeBadge" value="yes" checked={removeBadge} onChange={(event) => setRemoveBadge(event.target.checked)} /> Quitar imagen de placa actual</label></>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button>
  </form>;
}
