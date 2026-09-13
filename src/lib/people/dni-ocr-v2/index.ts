"use client";

import { candidateFromRightTokens, wordsForCandidate } from "./candidates.ts";
import { anchorForInferredField, diagnoseDocumentAnchors, findDocumentAnchors, findFieldAnchor } from "./anchors.ts";
import { clusterWordsIntoRows, wordsRightOfAnchor } from "./lines.ts";
import { createFullImageVariants, createRegionalVariant } from "./preprocess.ts";
import { compareLanguage, createDniWorker, diagnoseRecognition, recognizeVariant, type DniWorker } from "./recognize.ts";
import { chooseIdentityCandidate, scoreIdentityCandidate } from "./scoring.ts";
import type { DniAnchor, DniField, DniFieldDebug, DniPassDebug, DniPipelineEvent, DniRow, DniTokenRejection, DniV2Debug, DniV2Fields, DniV2Result, ScoredDniCandidate } from "./types.ts";

const FIELDS: DniField[] = ["surname", "firstName"];
const LABEL_ORDER = ["surname", "firstName", "birthDate", "sex", "nationality"] as const;

export function anchorsFollowDocumentOrder(anchors: ReturnType<typeof findDocumentAnchors>) {
  const found = LABEL_ORDER.map((label) => anchors[label]).filter((anchor): anchor is DniAnchor => Boolean(anchor));
  return found.every((anchor, index) => index === 0 || anchor.row.centerY > found[index - 1]!.row.centerY);
}

function dynamicRegion(field: DniFieldDebug, bounds: { width: number; height: number }) {
  const anchor = field.anchor; const row = field.row;
  if (!anchor || !row) return undefined;
  const margin = Math.max(4, (anchor.word.bbox.y1 - anchor.word.bbox.y0) * 0.35);
  const rightWords = field.rowTokens;
  const end = rightWords.at(-1)?.bbox.x1 ?? Math.max(anchor.word.bbox.x1 + margin * 12, bounds.width - margin);
  const x = Math.min(bounds.width - 1, anchor.word.bbox.x1 + margin * 0.6);
  const y = Math.max(0, row.bbox.y0 - margin);
  return { x, y, width: Math.max(1, Math.min(bounds.width, end + margin) - x), height: Math.min(bounds.height, row.height + margin * 2) };
}

function normalizedRegion(region: { x: number; y: number; width: number; height: number }, bounds: { width: number; height: number }) {
  return { x: Math.max(0, region.x / bounds.width), y: Math.max(0, region.y / bounds.height), width: Math.min(1, region.width / bounds.width), height: Math.min(1, region.height / bounds.height) };
}

function initialField(rows: DniRow[], anchors: ReturnType<typeof findDocumentAnchors>, field: DniField): DniFieldDebug {
  const anchor = findFieldAnchor(rows, anchors, field);
  const row = anchor?.row;
  const allRightTokens = anchor && row ? wordsRightOfAnchor(row, anchor) : [];
  const rowTokens = anchor && row ? wordsForCandidate(row, anchor) : [];
  const token = anchor && row ? candidateFromRightTokens(row, anchor) : undefined;
  const tokenCandidate = token ? scoreIdentityCandidate({ ...token, geometry: anchors[field] ? 1 : 0.85 }) : undefined;
  const rawText = allRightTokens.map((word) => word.text).join(" ");
  const rawCandidate = anchor && rawText ? scoreIdentityCandidate({ text: rawText, confidence: allRightTokens.reduce((sum, word) => sum + (word.confidence ?? 0), 0) / Math.max(1, allRightTokens.length), geometry: anchors[field] ? 1 : 0.85, repetitions: 1 }) : undefined;
  const rejectedTokens: DniTokenRejection[] = [];
  for (const candidateRow of rows) for (const word of candidateRow.words) {
    if (candidateRow !== row) rejectedTokens.push({ text: word.text, reason: "different row", confidence: word.confidence, bbox: word.bbox });
    else if (!anchor) rejectedTokens.push({ text: word.text, reason: "anchor missing", confidence: word.confidence, bbox: word.bbox });
    else if (word === anchor.word) rejectedTokens.push({ text: word.text, reason: "anchor label", confidence: word.confidence, bbox: word.bbox });
    else if (word.bbox.x0 < anchor.word.bbox.x1) rejectedTokens.push({ text: word.text, reason: "left of anchor", confidence: word.confidence, bbox: word.bbox });
    else if (!/\p{L}/u.test(word.text)) rejectedTokens.push({ text: word.text, reason: "not alphabetic", confidence: word.confidence, bbox: word.bbox });
  }
  return { field, anchor, row, rowTokens, allRightTokens, rejectedTokens, rawCandidate, score: rawCandidate?.scoreDebug ?? tokenCandidate?.scoreDebug, tokenCandidate, selected: tokenCandidate?.accepted ? tokenCandidate : undefined, decision: tokenCandidate?.accepted ? "same-row-tokens" : anchor ? "needs-regional-ocr" : "anchor-missing" };
}

function structuralScore(anchors: ReturnType<typeof findDocumentAnchors>, fields: Partial<Record<DniField, DniFieldDebug>>) {
  return (anchorsFollowDocumentOrder(anchors) ? 3 : 0) + Object.keys(anchors).length + FIELDS.filter((field) => fields[field]?.tokenCandidate?.accepted).length;
}

async function runFullPass(worker: DniWorker, variant: DniPassDebug["variant"], onProgress: (value: number) => void, captureEngineDiagnostics: boolean, collectPassDiagnostics: boolean, log: (message: string, details?: string) => void): Promise<DniPassDebug> {
  const started = performance.now();
  log(`Pass ${variant.mode} recognition started`, `input ${variant.processed.width}x${variant.processed.height}`);
  const recognition = await recognizeVariant(worker, variant, worker.auto);
  log(`Pass ${variant.mode} OCR complete`, `raw text length ${recognition.raw.length}; TSV length ${recognition.diagnostics.tsv.length ?? 0}; parsed words ${recognition.words.length}`);
  const rows = clusterWordsIntoRows(recognition.words);
  log(`Pass ${variant.mode} rows generated`, `${rows.length} rows`);
  const anchors = findDocumentAnchors(rows);
  const anchorDiagnostics = diagnoseDocumentAnchors(rows, anchors);
  log(`Pass ${variant.mode} anchors evaluated`, Object.entries(anchors).filter(([, value]) => value).map(([key]) => key).join(", ") || "none found");
  let diagnostic: DniPassDebug["diagnostic"] = collectPassDiagnostics ? { raw: recognition.diagnostics, input: variant, language: worker.engine.language, psm: worker.auto, wordCount: recognition.words.length, rowCount: rows.length, anchorCount: Object.keys(anchors).length, durationMs: recognition.durationMs } : undefined;
  if (captureEngineDiagnostics) {
    try {
      const tests = await diagnoseRecognition(worker, variant, worker.auto, recognition);
      diagnostic = { raw: tests.A, input: variant, language: worker.engine.language, psm: worker.auto, wordCount: recognition.words.length, rowCount: rows.length, anchorCount: Object.keys(anchors).length, durationMs: recognition.durationMs };
    } catch (error) {
      worker.engine.errors = [...worker.engine.errors, `diagnostics: ${error instanceof Error ? error.message : String(error)}`];
      log(`Pass ${variant.mode} diagnostics failed`, error instanceof Error ? error.message : String(error));
    }
  }
  const fields: Partial<Record<DniField, DniFieldDebug>> = {};
  const orderValid = anchorsFollowDocumentOrder(anchors);
  for (const field of FIELDS) {
    const extracted = initialField(rows, anchors, field);
    if (!orderValid && extracted.tokenCandidate) fields[field] = { ...extracted, tokenCandidate: { ...extracted.tokenCandidate, geometry: 0, score: -100, accepted: false }, selected: undefined, decision: "anchor-order-invalid" };
    else fields[field] = extracted;
  }
  onProgress(0);
  for (const field of Object.values(fields)) if (field) log(`Pass ${variant.mode} ${field.field} decision`, field.decision);
  return { mode: variant.mode, raw: recognition.raw, confidence: recognition.confidence, variant, rows, anchors, anchorDiagnostics, fields, durationMs: Math.round(performance.now() - started), diagnostic };
}

function bestPass(passes: DniPassDebug[], field: DniField) {
  return [...passes].sort((left, right) => structuralScore(right.anchors, right.fields) - structuralScore(left.anchors, left.fields) || (right.fields[field]?.tokenCandidate?.confidence ?? 0) - (left.fields[field]?.tokenCandidate?.confidence ?? 0))[0];
}

function sameText(left: string, right: string) { return left.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toUpperCase() === right.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toUpperCase(); }

async function regionalCandidates(worker: DniWorker, pass: DniPassDebug, field: DniField, onProgress: (value: number) => void, log: (message: string, details?: string) => void) {
  const debugField = pass.fields[field]; const region = debugField ? dynamicRegion(debugField, pass.variant.processed) : undefined;
  if (!debugField || !region) return undefined;
  log(`Regional OCR ${field} started`, JSON.stringify(region));
  const normalized = normalizedRegion(region, pass.variant.processed);
  const modes: Array<"A" | "B" | "C"> = ["A", "B"];
  const results: NonNullable<DniFieldDebug["regional"]>["passes"] = [];
  for (const mode of modes) {
    const image = await createRegionalVariant(pass.variant.blob, normalized, mode);
    const recognition = await recognizeVariant(worker, image, worker.singleLine, { text: true });
    const candidate = scoreIdentityCandidate({ text: recognition.raw, confidence: recognition.confidence, geometry: 1, repetitions: 1, source: "regional", pass: mode });
    results.push({ mode, raw: recognition.raw, confidence: recognition.confidence, candidate, previewUrl: image.previewUrl, input: { processed: image.processed, preprocess: image.preprocess } });
    onProgress(0);
  }
  let selected = chooseIdentityCandidate(results.map((result) => result.candidate).filter((candidate): candidate is ScoredDniCandidate => Boolean(candidate)));
  if (!selected) {
    const mode = "C" as const;
    const image = await createRegionalVariant(pass.variant.blob, normalized, mode);
    const recognition = await recognizeVariant(worker, image, worker.singleLine, { text: true });
    const candidate = scoreIdentityCandidate({ text: recognition.raw, confidence: recognition.confidence, geometry: 1, repetitions: 1, source: "regional", pass: mode });
    results.push({ mode, raw: recognition.raw, confidence: recognition.confidence, candidate, previewUrl: image.previewUrl, input: { processed: image.processed, preprocess: image.preprocess } });
    selected = chooseIdentityCandidate([candidate]);
  }
  return { region, passes: results, selected };
}

function mergeField(passes: DniPassDebug[], field: DniField): { selected?: ScoredDniCandidate; debug: DniFieldDebug; usedRegional: boolean } {
  const source = passes.map((pass) => pass.fields[field]?.tokenCandidate).filter((candidate): candidate is ScoredDniCandidate => Boolean(candidate && candidate.accepted));
  const selected = chooseIdentityCandidate(source);
  const base = bestPass(passes, field)?.fields[field] ?? { field, rowTokens: [], decision: "no-candidate" } as DniFieldDebug;
  return { selected, debug: { ...base, selected, decision: selected ? "consensus-same-row-tokens" : base.decision }, usedRegional: false };
}

function buildFields(surname: ScoredDniCandidate | undefined, firstName: ScoredDniCandidate | undefined, strategy: string): DniV2Fields {
  const lastName = surname?.accepted ? surname.text : ""; const first = firstName?.accepted ? firstName.text : "";
  const status = lastName && first ? "detected" : lastName || first ? "partial" : "empty";
  const lastScore = surname?.score ?? 0; const firstScore = firstName?.score ?? 0;
  const confidence = status === "detected" && lastScore >= 85 && firstScore >= 85 ? "high" : status === "empty" ? "low" : "medium";
  return { firstName: first, lastName, status, confidence, firstNameConfidence: firstScore, lastNameConfidence: lastScore, strategy };
}

function technicalError(error: unknown) {
  return error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { name: "Error", message: String(error) };
}

function failureReason(passes: DniPassDebug[], fields: DniV2Fields) {
  const pass = passes[0];
  if (!pass) return "No se pudo completar ningún pass de OCR";
  if (pass.raw && !pass.diagnostic?.wordCount && !pass.rows.length) return "TSV produjo 0 words; no se pudieron generar filas";
  if (!pass.anchors.surname) return "No se encontró anchor APELLIDO";
  if (!pass.anchors.firstName) return "No se encontró anchor NOMBRE";
  if (!pass.fields.surname?.allRightTokens?.length) return "Se encontraron anchors pero no tokens a la derecha de APELLIDO";
  if (!pass.fields.firstName?.allRightTokens?.length) return "Se encontraron anchors pero no tokens a la derecha de NOMBRE";
  if (pass.fields.surname?.rawCandidate && !pass.fields.surname.rawCandidate.accepted) return "Candidato apellido rechazado por score insuficiente o texto inválido";
  if (pass.fields.firstName?.rawCandidate && !pass.fields.firstName.rawCandidate.accepted) return "Candidato nombre rechazado por score insuficiente o texto inválido";
  if (pass.anchors && !anchorsFollowDocumentOrder(pass.anchors)) return "Orden geométrico de anchors inválido";
  if (fields.status === "partial") return "Solo uno de los dos campos superó la validación";
  if (fields.status === "empty") return "No hubo candidatos aceptados para nombre o apellido";
  return "Resultado rechazado por una etapa posterior";
}

function debugStatus(fields: DniV2Fields): DniV2Debug["status"] { return fields.status === "detected" ? "SUCCESS" : fields.status === "partial" ? "PARTIAL" : "FAILED"; }

export async function readDniV2(file: File, onProgress: (value: number) => void): Promise<DniV2Result> {
  const started = performance.now();
  const debugEnabled = process.env.NEXT_PUBLIC_OCR_DEBUG === "true";
  const pipelineLog: DniPipelineEvent[] = [];
  const log = (message: string, details?: string) => { if (debugEnabled) pipelineLog.push({ atMs: Math.round(performance.now() - started), message, details }); };
  let variants: Awaited<ReturnType<typeof createFullImageVariants>> = [];
  let worker: DniWorker | undefined;
  const passes: DniPassDebug[] = [];
  try {
    log("file selected", file.name);
    variants = await createFullImageVariants(file, true);
    log("image decoded", `${variants[0]?.original.width ?? 0}x${variants[0]?.original.height ?? 0}`);
    worker = await createDniWorker(onProgress);
    log("worker ready", `${worker.engine.language} / ${worker.auto}`);
    for (const variant of variants.slice(0, 2)) {
      const pass = await runFullPass(worker, variant, onProgress, debugEnabled && passes.length === 0, debugEnabled, log);
      passes.push(pass);
      if (debugEnabled && passes.length === 1) { log("language comparison started", "eng"); const comparison = await compareLanguage(variant, worker.auto); worker.engine.languageComparison = comparison; log("language comparison complete", `${comparison?.textLength ?? 0} chars`); }
    }
    const needsThird = passes.some((pass) => !pass.anchors.surname || !pass.anchors.firstName || !pass.fields.surname?.tokenCandidate?.accepted || !pass.fields.firstName?.tokenCandidate?.accepted);
    if (needsThird && variants[2]) passes.push(await runFullPass(worker, variants[2], onProgress, false, debugEnabled, log));
    else if (!variants[2]) log("Pass C skipped", "no third image variant");
    else log("Pass C skipped", "existing passes did not require it");

    const merged: Partial<Record<DniField, DniFieldDebug>> = {};
    const finalCandidates: Partial<Record<DniField, ScoredDniCandidate | undefined>> = {};
    let usedRegional = false;
    for (const field of FIELDS) {
      const mergedField = mergeField(passes, field);
      let selected = mergedField.selected;
      const needsRegional = !selected || selected.repetitions < 2 || selected.confidence < 75;
      const regionalReason = !selected ? "no accepted same-row candidate" : selected.repetitions < 2 ? "candidate lacks multi-pass repetition" : selected.confidence < 75 ? "candidate confidence below 75" : "regional OCR not needed";
      mergedField.debug = { ...mergedField.debug, regionalReason };
      if (needsRegional) {
        const pass = bestPass(passes, field);
        if (pass) {
          const regional = await regionalCandidates(worker, pass, field, onProgress, log);
          if (regional) {
            mergedField.debug = { ...mergedField.debug, regional, decision: regional.selected && (!selected || sameText(regional.selected.text, selected.text)) ? "regional-confirmed" : selected ? "same-row-tokens-priority" : "regional-only" };
            if (regional.selected && (!selected || sameText(regional.selected.text, selected.text))) {
              selected = selected ? { ...selected, confidence: Math.max(selected.confidence, regional.selected.confidence), repetitions: selected.repetitions + 1, score: Math.max(selected.score, regional.selected.score) } : regional.selected;
              usedRegional = true;
            }
          }
        }
      }
      mergedField.debug.selected = selected;
      merged[field] = mergedField.debug;
      finalCandidates[field] = selected;
    }
    const strategy = usedRegional ? "full-image-rows+regional" : "full-image-rows";
    const fields = buildFields(finalCandidates.surname, finalCandidates.firstName, strategy);
    const debug: DniV2Debug = { fileName: file.name, passes, fields: merged, strategy, durationMs: Math.round(performance.now() - started), status: debugStatus(fields), failureReason: fields.status === "detected" ? undefined : failureReason(passes, fields), pipelineLog, engine: debugEnabled ? worker.engine : undefined };
    if (debugEnabled) console.debug("[OCR V2 diagnostics]", debug);
    return { fields, debug };
  } catch (error) {
    const failure = technicalError(error);
    log("pipeline error", `${failure.name}: ${failure.message}`);
    if (debugEnabled) {
      const debug: DniV2Debug = { fileName: file.name, passes, fields: {}, strategy: "failed", durationMs: Math.round(performance.now() - started), status: "FAILED", failureReason: failure.message, error: failure, pipelineLog, engine: worker?.engine };
      const wrapped = error instanceof Error ? error : new Error(failure.message);
      Object.assign(wrapped, { debug });
      throw wrapped;
    }
    throw error;
  } finally {
    if (worker) await worker.worker.terminate();
  }
}

export { anchorForInferredField };
