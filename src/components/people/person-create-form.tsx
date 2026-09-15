"use client";

import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { readDniV2 } from "@/lib/people/dni-ocr-v2/index";
import type { DniV2Debug, DniV2Fields } from "@/lib/people/dni-ocr-v2/debug";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { BadgeOcrInput } from "./badge-ocr-input";
import { DniV2DebugPanel } from "./dni-v2-debug-panel";
import { ChoiceDialog, type ChoiceDialogOption } from "@/components/ui/choice-dialog";
import { buildDisplayName } from "@/lib/people/display-name";
import { canCheckDuplicates, classifyDuplicate, DuplicateCheckHttpError, type DuplicateCandidate } from "@/lib/people/duplicates";
import { getImageFromClipboardItems, validateImageFile } from "@/lib/people/clipboard";
import { resolvePasteTarget, type PasteTarget } from "@/lib/people/paste-target";
import { normalizePersonName } from "@/lib/normalization/person";
import { validateSelectedIne, type PersonType } from "@/lib/people/validation";
import { buildPersonCreateFormData, personCreateHttpMessage, postPersonCreate } from "@/lib/people/create-submit";
import { getUpgradeDialogOptions, getUpgradeEndpoint, shouldSuppressAcceptedUpgrade, validateUpgradeFields } from "@/lib/people/upgrade-flow";
import { perfTimer } from "@/lib/perf";
import { invalidatePeopleFirstPages } from "@/lib/people/session-cache";
import { useToast } from "@/components/feedback/toast-provider";
import { useConnectivity } from "@/components/feedback/connectivity-provider";
import { postPersonDestination, type DeliveryRoute } from "@/lib/deliveries/navigation";

const DEBUG = process.env.NEXT_PUBLIC_OCR_DEBUG === "true";

type DuplicateResponse = {
  matches?: DuplicateCandidate[];
  archivedMatches?: DuplicateCandidate[];
  possibleMatches?: DuplicateCandidate[];
  badgeMatches?: DuplicateCandidate[];
};

type ChoiceState = {
  title: string;
  description: string;
  details?: string;
  options: ChoiceDialogOption[];
  resolve: (value: string) => void;
};

function candidateDetails(candidate: DuplicateCandidate | undefined) {
  if (!candidate) return undefined;
  return `${candidate.display_name} · ${candidate.type === "police" ? `Policía${candidate.badge_number ? ` · Placa ${candidate.badge_number}` : ""}` : "Civil"}`;
}

export function PersonCreateForm({ initialType = "civil", returnTo = null, searchHint = "" }: { initialType?: PersonType; returnTo?: DeliveryRoute | null; searchHint?: string }) {
  const router = useRouter();
  const toast = useToast(); const { online } = useConnectivity();
  const [type, setType] = useState<PersonType>(initialType);
  const [ocr, setOcr] = useState<DniV2Fields>({ firstName: "", lastName: "", status: "empty", confidence: "low", firstNameConfidence: 0, lastNameConfidence: 0, strategy: "full-image-rows" });
  const [ineFile, setIneFile] = useState<File | null>(null);
  const [badgeFile, setBadgeFile] = useState<File | null>(null);
  const [inePreviewUrl, setInePreviewUrl] = useState("");
  const [badgePreviewUrl, setBadgePreviewUrl] = useState("");
  const [activePasteTarget, setActivePasteTarget] = useState<PasteTarget | null>(null);
  const [manualIdentity, setManualIdentity] = useState({ first: false, last: false });
  const [displayName, setDisplayName] = useState("");
  const [displayNameManual, setDisplayNameManual] = useState(false);
  const [badgeNumber, setBadgeNumber] = useState("");
  const [progress, setProgress] = useState(0);
  const [ocrMessage, setOcrMessage] = useState<ReactNode>("Selecciona una INE para rellenar los nombres automáticamente.");
  const [pasteNotice, setPasteNotice] = useState("");
  const [error, setError] = useState("");
  const [duplicateCheckError, setDuplicateCheckError] = useState("");
  const [busy, setBusy] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeCandidate, setUpgradeCandidate] = useState<DuplicateCandidate | null>(null);
  const [choice, setChoice] = useState<ChoiceState | null>(null);
  const lastDuplicateSignature = useRef("");
  const duplicateRequest = useRef(0);
  const inePreviewRef = useRef("");
  const badgePreviewRef = useRef("");
  const acceptedUpgradeIdentity = useRef("");
  const policeFieldsRef = useRef<HTMLDivElement>(null);
  const [debug, setDebug] = useState<{ originalUrl: string; data?: DniV2Debug; error?: string } | null>(null);

  useEffect(() => () => {
    if (inePreviewRef.current) URL.revokeObjectURL(inePreviewRef.current);
    if (badgePreviewRef.current) URL.revokeObjectURL(badgePreviewRef.current);
  }, []);

  const askChoice = useCallback(async (title: string, description: string, options: ChoiceDialogOption[], details?: string) => {
    return new Promise<string>((resolve) => setChoice({ title, description, details, options, resolve }));
  }, []);

  async function readIne(file: File) {
    const originalUrl = URL.createObjectURL(file);
    setOcrMessage("Leyendo INE con OCR V2…");
    setProgress(0);
    setError("");
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
      setDebug(DEBUG ? { originalUrl, data: fallbackDebug, error: technicalError } : null);
      setOcr({ firstName: "", lastName: "", status: "empty", confidence: "low", firstNameConfidence: 0, lastNameConfidence: 0, strategy: "full-image-rows" });
      setOcrMessage("No se pudo leer la INE. Puedes escribir los datos manualmente.");
      if (DEBUG) console.debug("[OCR DNI V2 ERROR]", technicalError);
    } finally {
      setProgress(0);
    }
  }

  const duplicateInput = useCallback(() => {
    return { type, firstName: ocr.firstName, lastName: ocr.lastName, displayName, badgeNumber };
  }, [badgeNumber, displayName, ocr.firstName, ocr.lastName, type]);

  const requestDuplicates = useCallback(async (signal?: AbortSignal) => {
    const payload = duplicateInput();
    if (process.env.NODE_ENV === "development") console.log("[duplicates request]", { firstName: payload.firstName, lastName: payload.lastName, displayName: payload.displayName, personType: payload.type, badgeNumber: payload.badgeNumber });
    const response = await fetch("/api/people/duplicates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal });
    const data = await response.json().catch(() => null);
    if (process.env.NODE_ENV === "development") console.log("[duplicates response]", { status: response.status, ok: response.ok, payload: data });
    if (!response.ok) throw new DuplicateCheckHttpError(response.status, data);
    return data as DuplicateResponse;
  }, [duplicateInput]);

  const duplicateSignature = useCallback(() => {
    return `${type}|${normalizePersonName(ocr.firstName)}|${normalizePersonName(ocr.lastName)}|${normalizePersonName(badgeNumber)}`;
  }, [badgeNumber, ocr.firstName, ocr.lastName, type]);

  const upgradeIdentity = useCallback(() => `${normalizePersonName(ocr.firstName)}|${normalizePersonName(ocr.lastName)}`, [ocr.firstName, ocr.lastName]);

  const acceptUpgradeCandidate = useCallback((candidate: DuplicateCandidate) => {
    acceptedUpgradeIdentity.current = upgradeIdentity();
    setUpgradeCandidate(candidate);
    setOcrMessage("Persona existente vinculada. Completa la placa para continuar.");
  }, [upgradeIdentity]);

  useEffect(() => {
    if (!upgradeCandidate) return;
    if (acceptedUpgradeIdentity.current !== upgradeIdentity()) { setUpgradeCandidate(null); return; }
    policeFieldsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [upgradeCandidate, upgradeIdentity]);

  const showDuplicate = useCallback(async (classification: ReturnType<typeof classifyDuplicate>, allowContinue: boolean) => {
    if (classification.kind === "none") return "continue";
    if (classification.kind === "upgrade-candidate") return askChoice(
      "Esta persona ya está registrada",
      `${classification.candidate.display_name} ya existe como civil. Puedes agregar sus datos policiales sin crear otro registro.`,
      getUpgradeDialogOptions(),
      `${candidateDetails(classification.candidate)} · La INE existente se conservará.`,
    );
    if (classification.kind === "badge-conflict") return askChoice(
      "La placa ya está asociada a otra persona",
      `La placa ${classification.candidate.badge_number ?? "ingresada"} ya está registrada en otra persona.`,
      [{ key: "view", label: "Ver registro", tone: "primary" }, { key: "cancel", label: "Cancelar", tone: "ghost" }],
      candidateDetails(classification.candidate),
    );
    if (classification.kind === "archived") return askChoice(
      "Existe un registro archivado",
      "La persona está archivada y no se puede actualizar automáticamente.",
      [{ key: "cancel", label: "Cancelar", tone: "ghost" }],
      candidateDetails(classification.candidate),
    );
    const duplicate = classification.kind === "duplicate";
    return askChoice(
      duplicate && classification.candidate.type === "police" ? "Esta persona ya está registrada como policía" : duplicate ? "Esta persona ya está registrada" : "Encontramos una posible coincidencia",
      duplicate ? "Puedes usar el registro existente. No se creará una segunda persona." : "Revisa este registro antes de crear uno nuevo.",
      [{ key: "view", label: duplicate ? "Ver registro" : "Ver coincidencia", tone: "primary" }, ...(!duplicate && allowContinue ? [{ key: "continue", label: "Continuar registro", tone: "secondary" as const }] : []), { key: "cancel", label: "Cerrar", tone: "ghost" }],
      candidateDetails(classification.candidate),
    );
  }, [askChoice]);

  async function upgradePolice(candidate: DuplicateCandidate, formElement: HTMLFormElement) {
    const form = new FormData(formElement);
    form.delete("ine");
    form.delete("badge");
    if (ineFile) form.set("ine", ineFile, ineFile.name);
    if (badgeFile) form.set("badge", badgeFile, badgeFile.name);
    setUpgrading(true);
    try {
      const response = await fetch(getUpgradeEndpoint(candidate.id), { method: "POST", body: form });
      const payload = await response.json().catch(() => null) as { error?: string; person?: { id?: string } } | null;
      if (!response.ok) { setError(payload?.error ?? "No se pudieron agregar los datos policiales."); return; }
      const personId = payload?.person?.id ?? candidate.id;
      invalidatePeopleFirstPages(); toast.success("Datos policiales agregados."); router.push(returnTo ? postPersonDestination(returnTo, "police", personId) : `/people/${personId}?upgraded=1`);
    } catch {
      const failure = "No se pudo conectar con el servidor. Intenta de nuevo."; setError(failure); toast.error(failure);
    } finally {
      setUpgrading(false);
    }
  }

  async function handleGlobalPaste(event: ClipboardEvent<HTMLFormElement>) {
    const file = getImageFromClipboardItems(event.clipboardData.items);
    if (!file) return;
    event.preventDefault();
    const validationError = validateImageFile(file);
    if (validationError) { setError(validationError); return; }
    let target = resolvePasteTarget(type, Boolean(ineFile), Boolean(badgeFile), activePasteTarget);
    if (target === "ambiguous") {
      const selected = await askChoice("¿Qué documento estás pegando?", "Selecciona dónde quieres colocar esta imagen.", [{ key: "ine", label: "INE", tone: "primary" }, { key: "badge", label: "Placa policial", tone: "secondary" }, { key: "cancel", label: "Cancelar", tone: "ghost" }]);
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

  useEffect(() => {
    const first = ocr.firstName.trim();
    const last = ocr.lastName.trim();
    if (!canCheckDuplicates(first, last, displayName)) return;
    const signature = duplicateSignature();
    const requestId = ++duplicateRequest.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await requestDuplicates(controller.signal);
        setDuplicateCheckError("");
        if (requestId !== duplicateRequest.current) return;
        const classification = classifyDuplicate({ type, matches: data.matches ?? [], archivedMatches: data.archivedMatches ?? [], possibleMatches: data.possibleMatches ?? [], badgeMatches: data.badgeMatches ?? [] });
        if (classification.kind === "none" || signature === lastDuplicateSignature.current || shouldSuppressAcceptedUpgrade(classification.candidate?.id ?? null, upgradeIdentity(), upgradeCandidate?.id ?? null, acceptedUpgradeIdentity.current)) return;
        lastDuplicateSignature.current = signature;
        const result = await showDuplicate(classification, true);
        if (result === "view" && classification.candidate) router.push(`/people/${classification.candidate.id}`);
        if (result === "upgrade" && classification.kind === "upgrade-candidate") acceptUpgradeCandidate(classification.candidate);
      } catch (caught) {
        if (caught instanceof Error && caught.name === "AbortError") return;
        if (caught instanceof DuplicateCheckHttpError) {
          setDuplicateCheckError("No se pudo comprobar duplicados automáticamente.");
        } else if (process.env.NODE_ENV === "development") {
          console.debug("[people/duplicates] debounce check failed", caught);
        }
      }
    }, 500);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [acceptUpgradeCandidate, ocr.firstName, ocr.lastName, badgeNumber, type, displayName, duplicateSignature, requestDuplicates, router, showDuplicate, upgradeCandidate?.id, upgradeIdentity]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!online) { const offline = "No hay conexión. Intenta nuevamente cuando recuperes internet."; setError(offline); toast.error(offline); return; }
    const formElement = event.currentTarget;
    if (upgradeCandidate) {
      const upgradeError = validateUpgradeFields(badgeNumber, badgeFile instanceof File);
      if (upgradeError) { setError(upgradeError); return; }
      setBusy(true);
      setError("");
      const done = perfTimer("upgrade person to police");
      try { await upgradePolice(upgradeCandidate, formElement); } finally { setBusy(false); done(); }
      return;
    }
    const documentError = validateSelectedIne(type, Boolean(ineFile));
    if (documentError) { setError(documentError); return; }
    setBusy(true);
    setError("");
    setDuplicateCheckError("");
    const done = perfTimer("create person");
    try {
      let duplicateData: DuplicateResponse = {};
      try {
        duplicateData = await requestDuplicates();
      } catch (caught) {
        if (caught instanceof DuplicateCheckHttpError) {
          setDuplicateCheckError(caught.message);
        } else {
          if (process.env.NODE_ENV === "development") console.debug("[people/duplicates] final check failed", caught);
          setDuplicateCheckError("No se pudo comprobar duplicados. Intenta de nuevo.");
        }
        return;
      }
      const classification = classifyDuplicate({ type, matches: duplicateData.matches ?? [], archivedMatches: duplicateData.archivedMatches ?? [], possibleMatches: duplicateData.possibleMatches ?? [], badgeMatches: duplicateData.badgeMatches ?? [] });
      let confirmDuplicates = false;
      if (classification.kind !== "none") {
        const result = await showDuplicate(classification, true);
        if (result === "view" && classification.candidate) { router.push(`/people/${classification.candidate.id}`); return; }
        if (result === "upgrade" && classification.kind === "upgrade-candidate") { acceptUpgradeCandidate(classification.candidate); return; }
        if (result !== "continue") return;
        confirmDuplicates = true;
      }
      const form = buildPersonCreateFormData(new FormData(formElement), type, ineFile, badgeFile, confirmDuplicates);
      if (process.env.NODE_ENV === "development") {
        console.log("[person-create submit]", {
          type,
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          displayName: form.get("displayName"),
          badgeNumber: form.get("badgeNumber"),
          hasIne: ineFile instanceof File,
          ineName: ineFile?.name,
          ineType: ineFile?.type,
          ineSize: ineFile?.size,
          hasBadge: badgeFile instanceof File,
          badgeName: badgeFile?.name,
          badgeType: badgeFile?.type,
          badgeSize: badgeFile?.size,
        });
        console.log("[person-create formData]", Array.from(form.entries()).map(([key, value]) => ({ key, value: value instanceof File ? { kind: "File", name: value.name, type: value.type, size: value.size } : value })));
      }
      let result = await postPersonCreate(form);
      if (result.kind === "network") {
        if (process.env.NODE_ENV === "development") console.error("[POST /api/people network error]", result.error);
        setError("No se pudo conectar con el servidor. Intenta de nuevo.");
        return;
      }
      if (process.env.NODE_ENV === "development") console.log("[POST /api/people response]", { status: result.response.status, ok: result.response.ok, payload: result.payload });
      if (result.response.status === 409) {
        const payload = result.payload as (DuplicateResponse & { duplicates?: DuplicateResponse }) | null;
        const duplicatePayload = payload?.duplicates ?? payload;
        const serverClassification = classifyDuplicate({ type, matches: duplicatePayload?.matches ?? [], archivedMatches: duplicatePayload?.archivedMatches ?? [], possibleMatches: duplicatePayload?.possibleMatches ?? [], badgeMatches: duplicatePayload?.badgeMatches ?? [] });
        if (serverClassification.kind === "none") { setError(personCreateHttpMessage(result.response.status, result.payload)); return; }
        const choiceResult = await showDuplicate(serverClassification, true);
        if (choiceResult === "view" && serverClassification.candidate) { router.push(`/people/${serverClassification.candidate.id}`); return; }
        if (choiceResult === "upgrade" && serverClassification.kind === "upgrade-candidate") { acceptUpgradeCandidate(serverClassification.candidate); return; }
        if (choiceResult !== "continue") return;
        form.set("confirmDuplicates", "yes");
        result = await postPersonCreate(form);
        if (result.kind === "network") {
          if (process.env.NODE_ENV === "development") console.error("[POST /api/people network error]", result.error);
          setError("No se pudo conectar con el servidor. Intenta de nuevo.");
          return;
        }
        if (process.env.NODE_ENV === "development") console.log("[POST /api/people response]", { status: result.response.status, ok: result.response.ok, payload: result.payload });
      }
      if (!result.response.ok) { setError(personCreateHttpMessage(result.response.status, result.payload)); return; }
      const data = result.payload as { person?: { id?: string } } | null;
      const personId = data?.person?.id;
      if (!personId) { setError("No se pudo registrar la persona."); return; }
      invalidatePeopleFirstPages(); if (process.env.NODE_ENV === "development") console.log("[person-create] API success", { personId });
      if (process.env.NODE_ENV === "development") console.log("[person-create] navigating", { personId });
      try {
        toast.success("Persona registrada correctamente."); router.push(postPersonDestination(returnTo, type, personId));
      } catch (caught) {
        if (process.env.NODE_ENV === "development") console.error("[person-create] navigation failed", caught);
        setError("La persona se registró, pero no se pudo abrir su ficha.");
      }
    } finally {
      setBusy(false);
      done();
    }
  }

  function setFirstName(value: string) {
    setDuplicateCheckError("");
    setManualIdentity((state) => ({ ...state, first: true }));
    setOcr((current) => ({ ...current, firstName: value }));
    if (!displayNameManual) setDisplayName(buildDisplayName(value, ocr.lastName));
  }

  function setLastName(value: string) {
    setDuplicateCheckError("");
    setManualIdentity((state) => ({ ...state, last: true }));
    setOcr((current) => ({ ...current, lastName: value }));
    if (!displayNameManual) setDisplayName(buildDisplayName(ocr.firstName, value));
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

  function clearIne() {
    setIneFile(null);
    if (inePreviewRef.current) URL.revokeObjectURL(inePreviewRef.current);
    inePreviewRef.current = "";
    setInePreviewUrl("");
    setManualIdentity({ first: false, last: false });
    setOcr((current) => ({ ...current, firstName: "", lastName: "", status: "empty", confidence: "low" }));
    if (!displayNameManual) setDisplayName("");
    setOcrMessage(type === "civil" ? "La INE es obligatoria para civiles." : "Puedes continuar sin INE y completar el documento después.");
    setDebug(null);
    setError("");
  }

  const autoDisplayName = buildDisplayName(ocr.firstName, ocr.lastName);
  return <form onSubmit={submit} onPaste={handleGlobalPaste} className="glass-card grid gap-5 p-6">{searchHint && <p className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3 text-sm text-[var(--text-secondary)]">Buscabas: <strong>{searchHint}</strong></p>}<label className="field">Tipo de persona<select name="type" className="field-input" value={type} onChange={(event) => { const nextType = event.target.value as PersonType; setType(nextType); if (nextType !== "police") setUpgradeCandidate(null); }}><option value="civil">Civil</option><option value="police">Policía</option></select></label>{type === "police" && <p className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3 text-sm text-[var(--text-secondary)]">Puedes registrar al policía con INE, placa o ambos. Luego podrás completar la información faltante.</p>}<UploadDropzone name="ine" label="Subir INE" pasteTarget="ine" onActivate={setActivePasteTarget} formField={false} allowRemove file={ineFile} previewUrl={inePreviewUrl} onFile={handleIneFile} onClear={clearIne} /><div aria-live="polite" className="rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-sm text-[var(--text-secondary)]">{ocrMessage}{progress > 0 && <span> {progress}%</span>}</div>{pasteNotice && <p className="text-sm text-emerald-300" role="status">{pasteNotice}</p>}{DEBUG && debug?.data && <DniV2DebugPanel originalUrl={debug.originalUrl} debug={debug.data} fields={ocr} />}{DEBUG && debug?.error && <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-red-300">{debug.error}</pre>}<div className="grid gap-4 sm:grid-cols-2"><label className="field">Nombre<input required name="firstName" className="field-input" placeholder="Nombre" value={ocr.firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label className="field">Apellido<input required name="lastName" className="field-input" placeholder="Apellido" value={ocr.lastName} onChange={(event) => setLastName(event.target.value)} /></label></div><label className="field">Nombre visible<input required name="displayName" className="field-input" placeholder="Nombre visible" value={displayName} onChange={(event) => { setDisplayName(event.target.value); setDisplayNameManual(true); }} /></label>{displayNameManual && <button className="button button-ghost justify-self-start text-sm" type="button" onClick={() => { setDisplayNameManual(false); setDisplayName(autoDisplayName); }}>Restablecer automático</button>}{upgradeCandidate && <div ref={policeFieldsRef} className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4"><p className="font-semibold text-emerald-300">✓ Persona existente</p><p className="mt-2 text-lg font-bold">{upgradeCandidate.display_name}</p><p className="text-sm text-[var(--text-secondary)]">Actualmente: Civil</p><p className="mt-3 text-sm text-[var(--text-secondary)]">La INE existente se conservará. Agrega su placa para convertirla en Policía.</p><div className="mt-3 flex flex-wrap gap-3"><button className="button button-secondary" type="button" onClick={() => router.push(`/people/${upgradeCandidate.id}`)}>Ver registro</button><button className="button button-ghost" type="button" onClick={() => { setUpgradeCandidate(null); acceptedUpgradeIdentity.current = ""; }}>Cancelar vinculación</button></div></div>}{type === "police" && <label className="field">Número de placa<input name="badgeNumber" className="field-input" placeholder="Número de placa" value={badgeNumber} onChange={(event) => setBadgeNumber(event.target.value)} /></label>}{type === "police" && <BadgeOcrInput formField={false} file={badgeFile} previewUrl={badgePreviewUrl} onActivate={setActivePasteTarget} onFile={handleBadgeFile} onDetected={setBadgeNumber} />}{duplicateCheckError && <p className="text-sm text-amber-300" role="status">No se pudo comprobar duplicados automáticamente: {duplicateCheckError}</p>}{error && <p className="form-error" role="alert">{error}</p>}<button disabled={busy} className="button button-primary" type="submit">{busy ? (upgrading ? "Agregando datos policiales…" : "Guardando…") : upgradeCandidate ? "Agregar datos policiales" : "Confirmar y registrar"}</button><ChoiceDialog open={Boolean(choice)} title={choice?.title ?? ""} description={choice?.description ?? ""} details={choice?.details} options={choice?.options ?? []} onSelect={(value) => { const resolver = choice?.resolve; setChoice(null); resolver?.(value); }} onClose={() => { const resolver = choice?.resolve; setChoice(null); resolver?.("cancel"); }} /></form>;
}
