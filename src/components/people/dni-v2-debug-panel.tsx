"use client";

import { useState } from "react";
import type { DniFieldDebug, DniPassDebug, DniRawOutputDiagnostics, DniRow, DniV2Debug, DniV2Fields, DniWord } from "@/lib/people/dni-ocr-v2/types";
import { OcrDebugImage } from "./ocr-debug-image";

function text(value: unknown) { return typeof value === "string" ? value || "(vacÃ­o)" : JSON.stringify(value) || "(vacÃ­o)"; }
function wordsIn(pass: DniPassDebug) { return pass.rows.flatMap((row) => row.words); }
function diagnosticText(debug: DniV2Debug, fields: DniV2Fields) { return JSON.stringify({ fileName: debug.fileName, duration: debug.durationMs, rawText: debug.passes.map((pass) => pass.raw), rawOutputs: debug.passes.map((pass) => pass.diagnostic?.raw), geometrySource: debug.passes.map((pass) => pass.diagnostic?.raw.geometrySource), words: debug.passes.flatMap(wordsIn), rows: debug.passes.flatMap((pass) => pass.rows), anchors: debug.passes.map((pass) => pass.anchorDiagnostics ?? pass.anchors), candidates: debug.fields, regionalOcr: debug.fields, finalResult: fields, failureReason: debug.failureReason, errors: debug.error ? [debug.error] : debug.engine?.errors ?? [] }, null, 2); }

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" className="button button-secondary text-xs" onClick={() => { void navigator.clipboard.writeText(value).then(() => setCopied(true)); }}>{copied ? "Copiado" : label}</button>;
}

function DownloadButton({ debug, fields }: { debug: DniV2Debug; fields: DniV2Fields }) {
  return <button type="button" className="button button-secondary text-xs" onClick={() => { const blob = new Blob([diagnosticText(debug, fields)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `ocr-dni-${debug.fileName ?? "diagnostico"}.json`; link.click(); URL.revokeObjectURL(url); }}>Descargar diagnÃ³stico JSON</button>;
}

function Overlay({ pass, field }: { pass: DniPassDebug; field?: DniFieldDebug }) {
  const { width, height } = pass.variant.processed;
  const anchor = field?.anchor?.word.bbox;
  const row = field?.row?.bbox;
  return <div className="relative max-w-full overflow-hidden rounded-lg bg-black/40">
    <OcrDebugImage src={pass.variant.previewUrl} alt={`Input exacto Pass ${pass.mode}`} className="max-h-96 w-full object-contain" />
    {pass.rows.flatMap((item) => item.words).map((word, index) => <span key={`${word.text}-${index}`} className="pointer-events-none absolute border border-white/50" title={word.text} style={{ left: `${word.bbox.x0 / width * 100}%`, top: `${word.bbox.y0 / height * 100}%`, width: `${(word.bbox.x1 - word.bbox.x0) / width * 100}%`, height: `${(word.bbox.y1 - word.bbox.y0) / height * 100}%` }} />)}
    {row && <span className="pointer-events-none absolute border-2 border-cyan-400" style={{ left: `${row.x0 / width * 100}%`, top: `${row.y0 / height * 100}%`, width: `${(row.x1 - row.x0) / width * 100}%`, height: `${(row.y1 - row.y0) / height * 100}%` }} />}
    {anchor && <span className="pointer-events-none absolute border-2 border-amber-400" style={{ left: `${anchor.x0 / width * 100}%`, top: `${anchor.y0 / height * 100}%`, width: `${(anchor.x1 - anchor.x0) / width * 100}%`, height: `${(anchor.y1 - anchor.y0) / height * 100}%` }} />}
  </div>;
}


function OriginalOverlay({ pass, src }: { pass: DniPassDebug; src: string }) {
  const scaleX = pass.variant.original.width / pass.variant.processed.width;
  const scaleY = pass.variant.original.height / pass.variant.processed.height;
  return <div className="relative max-w-full overflow-hidden rounded-lg bg-black/40"><OcrDebugImage src={src} alt="Overlay sobre imagen original" className="max-h-96 w-full object-contain" />{wordsIn(pass).map((word, index) => <span key={`${word.text}-original-${index}`} className="pointer-events-none absolute border border-white/70" title={word.text} style={{ left: `${word.bbox.x0 * scaleX / pass.variant.original.width * 100}%`, top: `${word.bbox.y0 * scaleY / pass.variant.original.height * 100}%`, width: `${(word.bbox.x1 - word.bbox.x0) * scaleX / pass.variant.original.width * 100}%`, height: `${(word.bbox.y1 - word.bbox.y0) * scaleY / pass.variant.original.height * 100}%` }} />)}</div>;
}

function RawOutput({ raw }: { raw?: DniRawOutputDiagnostics }) {
  if (!raw) return <p>Sin salida raw disponible.</p>;
  return <div className="grid gap-3">
    <div className="flex flex-wrap gap-2"><span>TSV disponible: {raw.tsv.type === "string" ? "sÃ­" : "no"}</span><span>TSV length: {raw.tsv.length ?? 0}</span><span>Parsed words: {raw.parsedWordCount}</span><span>Geometry source: <strong>{raw.geometrySource}</strong></span></div>
    <div><div className="mb-1 flex items-center justify-between"><strong>=== RAW OCR TEXT ===</strong><CopyButton value={raw.text} label="Copiar Raw OCR" /></div><pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-3 text-xs">{raw.text || "(vacÃ­o)"}</pre></div>
    <details><summary className="cursor-pointer font-semibold">Ver TSV (primeras 100 lÃ­neas)</summary><div className="mt-2 flex justify-end"><CopyButton value={raw.tsv.text ?? raw.tsv.lines.join("\n")} label="Copiar TSV" /></div><pre className="max-h-72 overflow-auto whitespace-pre rounded bg-black/40 p-3 text-xs">{raw.tsv.text || "(TSV no disponible)"}</pre></details>
    <details><summary className="cursor-pointer font-semibold">Raw output structure</summary><div className="grid gap-1 p-2 text-xs"><p>result keys: {text(raw.resultKeys)}</p><p>data keys: {text(raw.dataKeys)}</p><p>data.words: {raw.words.exists ? `${raw.words.type} (${raw.words.count ?? 0})` : "undefined"}</p><p>blocks: {raw.blocks.type}, {raw.blocks.length ?? 0}; nested words: {raw.blocks.words}</p><p>hocr: {raw.hocr.type}, {raw.hocr.length ?? 0} chars</p></div></details>
  </div>;
}

function WordsTable({ words }: { words: DniWord[] }) {
  return <div className="overflow-x-auto"><table className="min-w-[900px] text-left text-xs"><thead><tr>{["#", "text", "confidence", "x0", "y0", "x1", "y1", "block", "paragraph", "line", "word"].map((heading) => <th key={heading} className="p-1">{heading}</th>)}</tr></thead><tbody>{words.map((word, index) => <tr key={`${word.text}-${index}`} className="border-t border-white/10"><td className="p-1">{index + 1}</td><td className="p-1">{word.text}</td><td className="p-1">{word.confidence ?? "â€”"}</td><td className="p-1">{word.bbox.x0}</td><td className="p-1">{word.bbox.y0}</td><td className="p-1">{word.bbox.x1}</td><td className="p-1">{word.bbox.y1}</td><td className="p-1">{word.blockNum ?? "â€”"}</td><td className="p-1">{word.paragraphNum ?? "â€”"}</td><td className="p-1">{word.lineNum ?? "â€”"}</td><td className="p-1">{word.wordNum ?? "â€”"}</td></tr>)}</tbody></table></div>;
}

function Rows({ rows }: { rows: DniRow[] }) {
  return <div className="grid gap-2">{rows.map((row) => <div key={row.index} className="rounded border border-white/10 p-2"><strong>ROW {row.index}</strong><p>centerY: {row.centerY.toFixed(1)} Â· minY: {row.bbox.y0} Â· maxY: {row.bbox.y1} Â· height: {row.height}</p><p>words: [{row.words.map((word) => word.text).join("] [")}]</p></div>)}</div>;
}

function Anchors({ pass }: { pass: DniPassDebug }) {
  const labels = ["surname", "firstName", "birthDate", "sex", "nationality", "document"] as const;
  return <div className="grid gap-2">{labels.map((label) => { const item = pass.anchorDiagnostics?.[label]; const anchor = pass.anchors[label]; return <div key={label} className="rounded border border-white/10 p-2"><strong>{label}</strong><p>found: {String(Boolean(anchor))} Â· matched: {text(item?.matchedText ?? anchor?.word.text)} Â· confidence: {item?.confidence ?? anchor?.word.confidence ?? "â€”"} Â· row: {item?.rowIndex ?? anchor?.row.index ?? "â€”"}</p><p>bbox: {text(item?.bbox ?? anchor?.word.bbox ?? "â€”")} Â· reason: {item?.matchReason ?? "â€”"}</p><p>top candidate matches: {text(item?.candidates ?? [])}</p></div>; })}</div>;
}

function Score({ field }: { field: DniFieldDebug }) {
  const score = field.score ?? field.rawCandidate?.scoreDebug ?? field.tokenCandidate?.scoreDebug;
  if (!score) return <p>No score calculado.</p>;
  return <div className="grid gap-1 text-xs"><p>candidate: {score.candidate}</p><p>base OCR confidence: {score.confidence} Â· geometry: {score.geometry} Â· repetitions: {score.repetitions}</p><p>geometry contribution: {score.geometryContribution.toFixed(2)} Â· confidence contribution: {score.confidenceContribution.toFixed(2)} Â· multi-pass: {score.repetitionContribution.toFixed(2)} Â· length bonus: {score.lengthBonus}</p><p>invalid-character penalty: {score.invalidPenalty} Â· final score: {score.score} Â· threshold: {score.threshold}</p><p>accepted: {String(score.accepted)} Â· rejection reason: {score.rejectionReason ?? "â€”"}</p></div>;
}

function FieldDiagnostics({ pass, field }: { pass: DniPassDebug; field: DniFieldDebug }) {
  const regional = field.regional;
  return <section className="grid gap-2 rounded border border-amber-400/20 p-3"><h4 className="font-semibold">{field.field === "surname" ? "APELLIDO" : "NOMBRE"}</h4><p>anchor: {text(field.anchor?.word.text ?? "not found")} Â· row: {field.row?.index ?? "â€”"}</p><p>tokens a la derecha: {text(field.allRightTokens?.map((word) => ({ text: word.text, confidence: word.confidence, bbox: word.bbox })) ?? [])}</p><p>tokens rechazados: {text(field.rejectedTokens ?? [])}</p><p>candidate assembled: {text(field.rawCandidate?.text ?? field.tokenCandidate?.text ?? "(none)")} Â· decision: {field.decision}</p><details open><summary className="cursor-pointer font-semibold">=== CANDIDATE SCORING ===</summary><Score field={field} /></details><p>Regional OCR: {regional ? "executed" : `not executed â€” ${field.regionalReason ?? "no reason recorded"}`}</p>{regional && <div className="grid gap-2"><p>crop: {text(regional.region)}</p>{regional.passes.map((item) => <figure key={item.mode}><figcaption>Regional PASS {item.mode}: raw {text(item.raw)} Â· confidence {item.confidence.toFixed(1)} Â· candidate {text(item.candidate?.text ?? "(none)")} Â· accepted {String(item.candidate?.accepted ?? false)}</figcaption><OcrDebugImage src={item.previewUrl} alt={`Regional ${field.field} ${item.mode}`} className="max-h-40 w-full bg-white object-contain" /></figure>)}</div>}<Overlay pass={pass} field={field} /></section>;
}

function Pass({ pass }: { pass: DniPassDebug }) {
  const words = wordsIn(pass);
  return <details open className="grid gap-3 rounded-lg border border-amber-400/20 p-3"><summary className="cursor-pointer font-semibold">=== PASS {pass.mode} === Â· {pass.durationMs} ms</summary><p>preprocess: {pass.variant.preprocess.contrast} Â· grayscale {String(pass.variant.preprocess.grayscale)} Â· scale {pass.variant.preprocess.scale.toFixed(2)}</p><p>input: {pass.variant.processed.width}Ã—{pass.variant.processed.height} Â· PSM: {pass.diagnostic?.psm ?? "3"} Â· language: {pass.diagnostic?.language ?? "spa"}</p><RawOutput raw={pass.diagnostic?.raw} /><section><h4 className="font-semibold">=== WORDS ===</h4><WordsTable words={words} /></section><section><h4 className="font-semibold">=== ROWS ===</h4><Rows rows={pass.rows} /></section><section><h4 className="font-semibold">=== ANCHORS ===</h4><Anchors pass={pass} /></section><section><h4 className="font-semibold">=== RIGHT-SIDE EXTRACTION ===</h4><div className="grid gap-3">{(["surname", "firstName"] as const).map((key) => pass.fields[key] && <FieldDiagnostics key={key} pass={pass} field={pass.fields[key]!} />)}</div></section></details>;
}

export function DniV2DebugPanel({ originalUrl, debug, fields }: { originalUrl: string; debug: DniV2Debug; fields: DniV2Fields }) {
  const raw = debug.passes[0]?.diagnostic?.raw;
  const plain = diagnosticText(debug, fields);
  return <details open className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm"><summary className="cursor-pointer text-lg font-semibold">OCR DNI V2 - DiagnÃ³stico</summary><div className="mt-4 grid gap-4"><section className="grid gap-2 rounded-lg border border-amber-400/30 p-3"><h3 className="font-semibold">Resumen</h3><p>Estado final: <strong>{debug.status ?? "FAILED"}</strong></p><p>Resultado: Nombre: {fields.firstName || "(vacÃ­o)"} Â· Apellido: {fields.lastName || "(vacÃ­o)"}</p><p>Confidence: {fields.confidence} Â· Strategy: {debug.strategy} Â· DuraciÃ³n total: {debug.durationMs} ms Â· Geometry source: {raw?.geometrySource ?? "none"}</p><p>FAILURE REASON: {debug.failureReason ?? "â€”"}</p>{debug.error && <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded bg-red-950/40 p-2 text-xs">{JSON.stringify(debug.error, null, 2)}</pre>}</section><section><h3 className="mb-2 font-semibold">Imagen original seleccionada</h3><OcrDebugImage src={originalUrl} alt="Imagen original seleccionada" className="max-h-96 w-full object-contain" />{debug.passes[0] && <OriginalOverlay pass={debug.passes[0]} src={originalUrl} />}</section><section className="flex flex-wrap gap-2"><CopyButton value={plain} label="Copiar diagnÃ³stico" /><DownloadButton debug={debug} fields={fields} /></section><section><h3 className="mb-2 font-semibold">=== RAW OUTPUT ===</h3><RawOutput raw={raw} /></section>{debug.passes.map((pass) => <Pass key={pass.mode} pass={pass} />)}<section><h3 className="font-semibold">=== PIPELINE LOG ===</h3><pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-3 text-xs">{(debug.pipelineLog ?? []).map((event) => `[${event.atMs}ms] ${event.message}${event.details ? ` â€” ${event.details}` : ""}`).join("\n") || "(sin eventos)"}</pre></section><section><h3 className="font-semibold">Resultado final</h3><p>firstName = {fields.firstName || "(manual)"}; lastName = {fields.lastName || "(manual)"}; confidence = {fields.confidence}</p></section></div></details>;
}

