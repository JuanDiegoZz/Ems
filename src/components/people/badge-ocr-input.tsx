"use client";

import { useState } from "react";
import { createOcrPlateRegions, createOcrRegion, type OcrPlateRegions } from "@/lib/people/ocr-image";
import { normalizeOcrProgress } from "@/lib/people/ocr-progress";
import { parseBadgeNumber } from "@/lib/people/plate-ocr";
import { UploadDropzone } from "@/components/ui/upload-dropzone";
import { OcrDebugImage } from "./ocr-debug-image";

type OcrWorker = { recognize(file: Blob | File): Promise<{ data: { text: string } }>; setParameters?: (parameters: Record<string, string | unknown>) => Promise<unknown>; terminate(): Promise<unknown> };
const DEBUG = process.env.NEXT_PUBLIC_OCR_DEBUG === "true";
const DIGIT_WHITELIST = "0123456789";

async function loadBadgeWorker(onProgress: (value: number) => void): Promise<OcrWorker> {
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker("eng", 1, { logger: (message) => onProgress(normalizeOcrProgress(message.progress)) });
  await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE, preserve_interword_spaces: "1", tessedit_char_whitelist: DIGIT_WHITELIST });
  return worker;
}

export function BadgeOcrInput({ onDetected }: { onDetected: (value: string) => void }) {
  const [message, setMessage] = useState("Puedes subir la imagen de placa y escribir el número manualmente.");
  const [progress, setProgress] = useState(0);
  const [debug, setDebug] = useState<{ originalUrl: string; plate?: OcrPlateRegions; number?: OcrPlateRegions["number"]; raw: string; error?: string } | null>(null);

  async function readBadge(file: File) {
    setMessage("Leyendo placa…");
    setProgress(0);
    let worker: OcrWorker | undefined;
    let originalUrl = "";
    try {
      originalUrl = URL.createObjectURL(file);
      const plateRegions = await createOcrPlateRegions(file);
      const region = plateRegions.number;
      if (DEBUG) {
        setDebug({ originalUrl, plate: plateRegions, number: region, raw: "" });
        console.debug("[OCR DEBUG badge detection]", { detection: plateRegions.detection, plate: plateRegions.plate.source, number: region.source, processed: region.processed });
      }
      worker = await loadBadgeWorker(setProgress);
      const result = await worker.recognize(region.blob);
      let rawText = result.data.text;
      let badgeNumber = parseBadgeNumber(rawText);
      if (!badgeNumber) {
        const fallback = await createOcrRegion(file, { x: 0.1, y: 0.52, width: 0.8, height: 0.4 });
        const fallbackResult = await worker.recognize(fallback.blob);
        rawText = `${rawText}\n${fallbackResult.data.text}`;
        badgeNumber = parseBadgeNumber(fallbackResult.data.text);
        if (DEBUG) setDebug((current) => current ? { ...current, number: fallback, raw: rawText } : current);
      }
      if (DEBUG) {
        setDebug((current) => current ? { ...current, raw: rawText } : current);
        console.debug("[OCR DEBUG badge raw]", { raw: rawText, badgeNumber });
      }
      if (badgeNumber) {
        onDetected(badgeNumber);
        setMessage("Placa detectada correctamente");
      } else {
        setMessage("No se pudo leer la placa; escribe el número manualmente.");
      }
    } catch (error) {
      const messageText = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      if (DEBUG) { setDebug((current) => current ? { ...current, error: messageText } : { originalUrl, raw: "", error: messageText }); console.debug("[OCR DEBUG badge error]", error); }
      setMessage("No se pudo leer la placa; escribe el número manualmente.");
    } finally {
      await worker?.terminate();
      setProgress(0);
    }
  }

  return <div className="grid gap-2"><UploadDropzone name="badge" label="Subir imagen de placa" onFile={readBadge} /><p className="text-sm text-[var(--muted)]" aria-live="polite">{message}{progress > 0 && ` ${progress}%`}</p>{DEBUG && debug && <details className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs"><summary className="cursor-pointer font-semibold">OCR DEBUG placa</summary><div className="mt-3 grid gap-3"><figure><figcaption>Imagen original</figcaption><OcrDebugImage src={debug.originalUrl} alt="Imagen original de placa" className="max-h-40 w-full object-contain" /></figure>{debug.plate && <figure><figcaption>Placa detectada</figcaption><OcrDebugImage src={debug.plate.plate.previewUrl} alt="Placa completa detectada" className="max-h-56 w-full object-contain" /></figure>}{debug.number && <figure><figcaption>Crop del número</figcaption><OcrDebugImage src={debug.number.previewUrl} alt="Crop del número de placa" className="max-h-32 w-full object-contain" /></figure>}<p><strong>Raw:</strong> <code>{debug.raw || "(pendiente)"}</code></p>{debug.error && <pre className="whitespace-pre-wrap text-red-300">{debug.error}</pre>}</div></details>}</div>;
}
