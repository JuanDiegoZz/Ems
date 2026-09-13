"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { readDniV2 } from "@/lib/people/dni-ocr-v2/index";
import type { DniV2Debug, DniV2Fields } from "@/lib/people/dni-ocr-v2/debug";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { BadgeOcrInput } from "./badge-ocr-input";
import { DniV2DebugPanel } from "./dni-v2-debug-panel";
import { buildDisplayName } from "@/lib/people/display-name";

const DEBUG = process.env.NEXT_PUBLIC_OCR_DEBUG === "true";

export function PersonCreateForm() {
  const router = useRouter();
  const [type, setType] = useState("civil");
  const [ocr, setOcr] = useState<DniV2Fields>({ firstName: "", lastName: "", status: "empty", confidence: "low", firstNameConfidence: 0, lastNameConfidence: 0, strategy: "full-image-rows" });
  const [manualIdentity, setManualIdentity] = useState({ first: false, last: false });
  const [displayName, setDisplayName] = useState("");
  const [displayNameManual, setDisplayNameManual] = useState(false);
  const [badgeNumber, setBadgeNumber] = useState("");
  const [progress, setProgress] = useState(0);
  const [ocrMessage, setOcrMessage] = useState("Selecciona una INE para rellenar los nombres automáticamente.");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [debug, setDebug] = useState<{ originalUrl: string; data?: DniV2Debug; error?: string } | null>(null);

  async function readIne(file: File) {
    const originalUrl = URL.createObjectURL(file);
    setOcrMessage("Leyendo INE con OCR V2…"); setProgress(0); setError("");
    try {
      const result = await readDniV2(file, setProgress);
      const nextFirst = manualIdentity.first ? ocr.firstName : result.fields.firstName;
      const nextLast = manualIdentity.last ? ocr.lastName : result.fields.lastName;
      setOcr((current) => ({ ...result.fields, firstName: manualIdentity.first ? current.firstName : result.fields.firstName, lastName: manualIdentity.last ? current.lastName : result.fields.lastName }));
      if (!displayNameManual) setDisplayName(buildDisplayName(nextFirst, nextLast));
      setDebug(DEBUG ? { originalUrl, data: result.debug } : null);
      if (result.fields.status === "detected" && result.fields.confidence === "high") setOcrMessage("INE detectada correctamente");
      else if (result.fields.status !== "empty") setOcrMessage("Detectamos parte de la información. Revisa los campos antes de continuar.");
      else setOcrMessage("No se pudo leer la INE. Puedes escribir los datos manualmente.");
    } catch (caught) {
      const technicalError = caught instanceof Error ? `${caught.name}: ${caught.message}\n${caught.stack ?? ""}` : String(caught);
      const diagnostic = caught instanceof Error && "debug" in caught ? (caught as Error & { debug?: DniV2Debug }).debug : undefined;
      const fallbackDebug: DniV2Debug = diagnostic ?? { fileName: file.name, passes: [], fields: {}, strategy: "failed", durationMs: 0, status: "FAILED", failureReason: technicalError, error: { name: caught instanceof Error ? caught.name : "Error", message: technicalError, stack: caught instanceof Error ? caught.stack : undefined }, pipelineLog: [] };
      setDebug(DEBUG ? { originalUrl, data: fallbackDebug, error: technicalError } : null); setOcr({ firstName: "", lastName: "", status: "empty", confidence: "low", firstNameConfidence: 0, lastNameConfidence: 0, strategy: "full-image-rows" }); setOcrMessage("No se pudo leer la INE. Puedes escribir los datos manualmente.");
      if (DEBUG) console.debug("[OCR DNI V2 ERROR]", technicalError);
    } finally { setProgress(0); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      let response = await fetch("/api/people", { method: "POST", body: form });
      if (response.status === 409 && window.confirm("Ya existe una coincidencia probable. ¿Deseas registrar de todos modos?")) { form.set("confirmDuplicates", "yes"); response = await fetch("/api/people", { method: "POST", body: form }); }
      const data = await response.json().catch(() => null) as { id?: string; error?: string } | null;
      if (!response.ok) { setError(data?.error ?? "No se pudo registrar"); return; }
      if (!data?.id) { setError("No se pudo registrar la persona."); return; }
      router.push(`/people/${data.id}`);
    } catch { setError("No se pudo conectar con el servidor. Intenta de nuevo."); }
    finally { setBusy(false); }
  }

  function setFirstName(value: string) {
    setManualIdentity((state) => ({ ...state, first: true }));
    setOcr((current) => ({ ...current, firstName: value }));
    if (!displayNameManual) setDisplayName(buildDisplayName(value, ocr.lastName));
  }

  function setLastName(value: string) {
    setManualIdentity((state) => ({ ...state, last: true }));
    setOcr((current) => ({ ...current, lastName: value }));
    if (!displayNameManual) setDisplayName(buildDisplayName(ocr.firstName, value));
  }

  const autoDisplayName = buildDisplayName(ocr.firstName, ocr.lastName);
  return <form onSubmit={submit} className="glass-card grid gap-5 p-6"><label className="field">Tipo de persona<select name="type" className="field-input" value={type} onChange={(event) => setType(event.target.value)}><option value="civil">Civil</option><option value="police">Policía</option></select></label>{type === "police" && <p className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3 text-sm text-[var(--text-secondary)]">Puedes registrar al policía con INE, placa o ambos. Luego podrás completar la información faltante.</p>}<UploadDropzone name="ine" label="Subir INE" required={type === "civil"} onFile={readIne} /><div aria-live="polite" className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-sm text-[var(--text-secondary)]">{ocrMessage}{progress > 0 && <span> {progress}%</span>}</div>{DEBUG && debug?.data && <DniV2DebugPanel originalUrl={debug.originalUrl} debug={debug.data} fields={ocr} />}{DEBUG && debug?.error && <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-red-300">{debug.error}</pre>}<div className="grid gap-4 sm:grid-cols-2"><label className="field">Nombre<input required name="firstName" className="field-input" placeholder="Nombre" value={ocr.firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label className="field">Apellido<input required name="lastName" className="field-input" placeholder="Apellido" value={ocr.lastName} onChange={(event) => setLastName(event.target.value)} /></label></div><label className="field">Nombre visible<input required name="displayName" className="field-input" placeholder="Nombre visible" value={displayName} onChange={(event) => { setDisplayName(event.target.value); setDisplayNameManual(true); }} /></label>{displayNameManual && <button className="button button-ghost justify-self-start text-sm" type="button" onClick={() => { setDisplayNameManual(false); setDisplayName(autoDisplayName); }}>Restablecer automático</button>}{type === "police" && <label className="field">Número de placa<input name="badgeNumber" className="field-input" placeholder="Número de placa" value={badgeNumber} onChange={(event) => setBadgeNumber(event.target.value)} /></label>}{type === "police" && <BadgeOcrInput onDetected={setBadgeNumber} />}{error && <p className="form-error" role="alert">{error}</p>}<button disabled={busy} className="button button-primary" type="submit">{busy ? "Guardando…" : "Confirmar y registrar"}</button></form>;
}
