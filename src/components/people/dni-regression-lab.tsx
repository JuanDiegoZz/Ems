"use client";

import { useState } from "react";
import { readDniV2 } from "@/lib/people/dni-ocr-v2/index";
import type { DniV2Debug, DniV2Fields } from "@/lib/people/dni-ocr-v2/debug";
import { DniV2DebugPanel } from "./dni-v2-debug-panel";

type Row = { file: string; fields?: DniV2Fields; debug?: DniV2Debug; originalUrl?: string; error?: string; durationMs?: number };
const EMPTY_FIELDS: DniV2Fields = { firstName: "", lastName: "", status: "empty", confidence: "low", firstNameConfidence: 0, lastNameConfidence: 0, strategy: "failed" };

function diagnostics(row: Row) {
  const pass = row.debug?.passes[0];
  const raw = row.debug?.engine?.tests?.A ?? pass?.diagnostic?.raw;
  const blocks = row.debug?.engine?.tests?.B.parsedWordCount ?? 0;
  return {
    rawText: raw?.textLength ? "sí" : "no",
    geometrySource: raw?.geometrySource ?? "none",
    words: pass?.diagnostic?.raw.parsedWordCount ?? raw?.parsedWordCount ?? (blocks || pass?.diagnostic?.wordCount || 0),
    rows: pass?.diagnostic?.rowCount ?? pass?.rows.length ?? 0,
    surnameAnchor: pass?.anchors.surname ? "sí" : "no",
    firstNameAnchor: pass?.anchors.firstName ? "sí" : "no",
    surnameCandidate: row.fields?.lastName || pass?.fields.surname?.rawCandidate?.text || "—",
    firstNameCandidate: row.fields?.firstName || pass?.fields.firstName?.rawCandidate?.text || "—",
    surnameScore: pass?.fields.surname?.score?.score ?? "—",
    firstNameScore: pass?.fields.firstName?.score?.score ?? "—",
    failureReason: row.debug?.failureReason || row.error || "—",
  };
}

export function DniRegressionLab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  async function run(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); const next: Row[] = [];
    for (const file of Array.from(files)) {
      const originalUrl = URL.createObjectURL(file); const started = performance.now();
      try {
        const result = await readDniV2(file, () => undefined);
        next.push({ file: file.name, fields: result.fields, debug: { ...result.debug, durationMs: Math.round(performance.now() - started) }, originalUrl });
      } catch (error) {
        const diagnostic = error instanceof Error && "debug" in error ? (error as Error & { debug?: DniV2Debug }).debug : undefined;
        next.push({ file: file.name, debug: diagnostic, error: error instanceof Error ? error.message : String(error), originalUrl, durationMs: Math.round(performance.now() - started) });
      }
      setRows([...next]);
    }
    setBusy(false);
  }
  return <section className="glass-card grid gap-4 p-5">
    <div><h2 className="text-lg font-semibold">Regression Lab OCR V2</h2><p className="text-sm text-[var(--text-secondary)]">Solo visible con NEXT_PUBLIC_OCR_DEBUG=true. Selecciona varias DNI para comparar la salida real de Tesseract.</p></div>
    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void run(event.target.files)} disabled={busy} />
    <div className="overflow-x-auto"><table className="min-w-[1500px] text-left text-sm"><thead><tr>{["Archivo", "Raw text", "Geometry", "Words", "Rows", "Anchor APELLIDO", "Anchor NOMBRE", "Apellido candidate", "Nombre candidate", "Apellido score", "Nombre score", "Resultado", "Estrategia", "Duración", "Failure reason", "Inspect"].map((heading) => <th key={heading} className="p-2">{heading}</th>)}</tr></thead><tbody>
      {rows.map((row) => { const info = diagnostics(row); return <tr key={row.file} className="border-t border-white/10"><td className="p-2">{row.file}</td><td className="p-2">{info.rawText}</td><td className="p-2">{info.geometrySource}</td><td className="p-2">{info.words}</td><td className="p-2">{info.rows}</td><td className="p-2">{info.surnameAnchor}</td><td className="p-2">{info.firstNameAnchor}</td><td className="p-2">{info.surnameCandidate}</td><td className="p-2">{info.firstNameCandidate}</td><td className="p-2">{info.surnameScore}</td><td className="p-2">{info.firstNameScore}</td><td className="p-2">{row.fields?.confidence || "—"}</td><td className="p-2">{row.fields?.strategy || "—"}</td><td className="p-2">{row.debug ? `${row.debug.durationMs} ms` : row.durationMs ? `${row.durationMs} ms` : "—"}</td><td className="max-w-xs p-2 text-red-300">{info.failureReason}</td><td className="p-2"><button type="button" className="button button-secondary text-xs" onClick={() => setSelected(row.file)} disabled={!row.debug}>Inspect</button></td></tr>; })}
      {!rows.length && <tr><td colSpan={16} className="p-3 text-[var(--text-muted)]">Selecciona imágenes para comenzar.</td></tr>}
    </tbody></table></div>
    {rows.map((row) => row.file === selected && row.debug && row.originalUrl && <DniV2DebugPanel key={`${row.file}-debug`} originalUrl={row.originalUrl} debug={row.debug} fields={row.fields ?? EMPTY_FIELDS} />)}
  </section>;
}
