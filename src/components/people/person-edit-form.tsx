"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { PersonRecord } from "@/server/people";
import { readDniV2 } from "@/lib/people/dni-ocr-v2/index";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { DocumentViewer } from "@/components/documents/document-viewer";
import { BadgeOcrInput } from "./badge-ocr-input";
import { ChoiceDialog, type ChoiceDialogOption } from "@/components/ui/choice-dialog";
import { getImageFromClipboardItems, validateImageFile } from "@/lib/people/clipboard";
import { resolvePasteTarget, type PasteTarget } from "@/lib/people/paste-target";
import { buildDisplayName } from "@/lib/people/display-name";
import { perfTimer } from "@/lib/perf";
import { useToast } from "@/components/feedback/toast-provider";
import { useConnectivity } from "@/components/feedback/connectivity-provider";

export function PersonEditForm({ person }: { person: PersonRecord }) {
  const router = useRouter();
  const toast = useToast(); const { online } = useConnectivity();
  const [firstName, setFirstName] = useState(person.first_name);
  const [lastName, setLastName] = useState(person.last_name);
  const [displayName, setDisplayName] = useState(person.display_name);
  const [displayNameManual, setDisplayNameManual] = useState(person.display_name !== `${person.first_name} ${person.last_name}`);
  const [badgeNumber, setBadgeNumber] = useState(person.badge_number ?? "");
  const [ineFile, setIneFile] = useState<File | null>(null);
  const [badgeFile, setBadgeFile] = useState<File | null>(null);
  const [inePreviewUrl, setInePreviewUrl] = useState("");
  const [badgePreviewUrl, setBadgePreviewUrl] = useState("");
  const [activePasteTarget, setActivePasteTarget] = useState<PasteTarget | null>(null);
  const [manualIdentity, setManualIdentity] = useState({ first: false, last: false });
  const [removeBadge, setRemoveBadge] = useState(false);
  const [ocrMessage, setOcrMessage] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [pasteNotice, setPasteNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<{ title: string; description: string; options: ChoiceDialogOption[]; resolve: (value: string) => void } | null>(null);
  const inePreviewRef = useRef("");
  const badgePreviewRef = useRef("");

  useEffect(() => () => {
    if (inePreviewRef.current) URL.revokeObjectURL(inePreviewRef.current);
    if (badgePreviewRef.current) URL.revokeObjectURL(badgePreviewRef.current);
  }, []);

  function syncDisplay(nextFirst: string, nextLast: string) {
    if (!displayNameManual) setDisplayName(buildDisplayName(nextFirst, nextLast));
  }

  function askChoice(title: string, description: string, options: ChoiceDialogOption[]) {
    return new Promise<string>((resolve) => setChoice({ title, description, options, resolve }));
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

  async function handleGlobalPaste(event: ClipboardEvent<HTMLFormElement>) {
    const file = getImageFromClipboardItems(event.clipboardData.items);
    if (!file) return;
    event.preventDefault();
    const validationError = validateImageFile(file);
    if (validationError) { setError(validationError); return; }
    let target = resolvePasteTarget(person.type, Boolean(ineFile || person.ine_path), Boolean(badgeFile || person.badge_path), activePasteTarget);
    if (target === "ambiguous") {
      const selected = await askChoice("¿Qué documento quieres reemplazar?", "Selecciona dónde quieres colocar esta imagen.", [{ key: "ine", label: "Reemplazar INE", tone: "primary" }, { key: "badge", label: "Reemplazar placa", tone: "secondary" }, { key: "cancel", label: "Cancelar", tone: "ghost" }]);
      if (selected !== "ine" && selected !== "badge") return;
      target = selected;
    }
    setError("");
    setPasteNotice("Imagen pegada correctamente");
    if (target === "ine") {
      handleIneFile(file);
    } else {
      handleBadgeFile(file);
    }
  }

  function handleIneFile(file: File) {
    const validationError = validateImageFile(file);
    if (validationError) { setError(validationError); return; }
    setIneFile(file);
    if (inePreviewRef.current) URL.revokeObjectURL(inePreviewRef.current);
    inePreviewRef.current = URL.createObjectURL(file);
    setInePreviewUrl(inePreviewRef.current);
    setError("");
    void readIne(file);
  }

  function handleBadgeFile(file: File) {
    const validationError = validateImageFile(file);
    if (validationError) { setError(validationError); return; }
    setBadgeFile(file);
    if (badgePreviewRef.current) URL.revokeObjectURL(badgePreviewRef.current);
    badgePreviewRef.current = URL.createObjectURL(file);
    setBadgePreviewUrl(badgePreviewRef.current);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!online) { const offline = "No hay conexión. Intenta nuevamente cuando recuperes internet."; setError(offline); toast.error(offline); return; }
    setBusy(true);
    setError("");
    const done = perfTimer("update person");
    try {
      const form = new FormData(event.currentTarget);
      form.delete("ine");
      form.delete("badge");
      if (ineFile) form.append("ine", ineFile, ineFile.name);
      if (badgeFile) form.append("badge", badgeFile, badgeFile.name);
      const response = await fetch(`/api/people/${person.id}`, { method: "PATCH", body: form });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "No se pudo actualizar la persona");
        return;
      }
      toast.success("Persona actualizada correctamente."); router.push(`/people/${person.id}`);
    } catch {
      const failure = "No se pudo conectar con el servidor. Intenta de nuevo."; setError(failure); toast.error(failure);
    } finally {
      setBusy(false);
      done();
    }
  }

  const autoDisplay = buildDisplayName(firstName, lastName);
  return <form onSubmit={submit} onPaste={handleGlobalPaste} className="glass-card grid gap-5 p-6">
    <h1 className="text-2xl font-bold">Editar persona</h1>
    {person.type === "police" && <p className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3 text-sm text-[var(--text-secondary)]">Completa cualquier dato faltante de este policía. Puedes guardar con al menos una identificación.</p>}
    <div className="grid gap-4 sm:grid-cols-2"><label className="field">Nombre<input required name="firstName" value={firstName} onChange={(event) => { const value = event.target.value; setFirstName(value); setManualIdentity((state) => ({ ...state, first: true })); syncDisplay(value, lastName); }} className="field-input" /></label><label className="field">Apellido<input required name="lastName" value={lastName} onChange={(event) => { const value = event.target.value; setLastName(value); setManualIdentity((state) => ({ ...state, last: true })); syncDisplay(firstName, value); }} className="field-input" /></label></div>
    <label className="field">Nombre visible<input required name="displayName" value={displayName} onChange={(event) => { setDisplayName(event.target.value); setDisplayNameManual(true); }} className="field-input" /></label>
    {displayNameManual && <button className="button button-ghost justify-self-start text-sm" type="button" onClick={() => { setDisplayNameManual(false); setDisplayName(autoDisplay); }}>Restablecer automático</button>}
    {person.ine_path && <div className="grid gap-2"><span className="field">INE actual</span><DocumentViewer personId={person.id} personName={person.display_name} kind="ine" label="Ver INE completa" /></div>}
    <UploadDropzone name="ine" label={person.ine_path ? "Cambiar INE" : "Subir INE"} pasteTarget="ine" onActivate={setActivePasteTarget} formField={false} file={ineFile} previewUrl={inePreviewUrl} onFile={handleIneFile} />
    {ocrMessage && <p className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-sm text-[var(--text-secondary)]" aria-live="polite">{ocrMessage}{ocrProgress > 0 && ` ${ocrProgress}%`}</p>}
    {pasteNotice && <p className="text-sm text-emerald-300" role="status">{pasteNotice}</p>}
    {person.type === "police" && <><label className="field">Número de placa<input name="badgeNumber" value={badgeNumber} onChange={(event) => setBadgeNumber(event.target.value)} className="field-input" placeholder="Número de placa" /></label>{person.badge_path && <div className="grid gap-2"><span className="field">Placa actual</span><DocumentViewer personId={person.id} personName={person.display_name} kind="badge" label="Ver placa completa" /></div>}<BadgeOcrInput formField={false} file={badgeFile} previewUrl={badgePreviewUrl} onActivate={setActivePasteTarget} onFile={handleBadgeFile} onDetected={setBadgeNumber} /><label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><input type="checkbox" name="removeBadge" value="yes" checked={removeBadge} onChange={(event) => setRemoveBadge(event.target.checked)} /> Quitar imagen de placa actual</label></>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button>
    <ChoiceDialog open={Boolean(choice)} title={choice?.title ?? ""} description={choice?.description ?? ""} options={choice?.options ?? []} onSelect={(value) => { const resolver = choice?.resolve; setChoice(null); resolver?.(value); }} onClose={() => { const resolver = choice?.resolve; setChoice(null); resolver?.("cancel"); }} />
  </form>;
}
