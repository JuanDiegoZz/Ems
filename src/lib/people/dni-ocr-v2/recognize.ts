"use client";

import type { DniEngineDiagnostics, DniImageVariant, DniRawOutputDiagnostics, DniWord, DniWorkerEvent } from "./types.ts";
import { flattenTesseractBlocks, parseTesseractTsv } from "./tsv.ts";

type RawPage = Record<string, unknown>;
type RawResult = { jobId?: string; data: RawPage };
type Worker = {
  setParameters(parameters: Record<string, unknown>): Promise<unknown>;
  recognize(blob: Blob, options?: Record<string, unknown>, output?: Record<string, boolean>): Promise<RawResult>;
  terminate(): Promise<unknown>;
};

export type DniWorker = { worker: Worker; auto: string; singleLine: string; engine: DniEngineDiagnostics };

const TESSERACT_VERSION = "6.0.1";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1abcdefghijklmnopqrstuvwxyz\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1 '-";

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function asString(value: unknown) { return typeof value === "string" ? value : ""; }
function asNumber(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function typeOf(value: unknown) { return value === null ? "null" : Array.isArray(value) ? "array" : typeof value; }

function geometryFrom(value: unknown) {
  if (!isRecord(value) || !["x0", "y0", "x1", "y1"].every((key) => typeof value[key] === "number")) return undefined;
  return { x0: value.x0 as number, y0: value.y0 as number, x1: value.x1 as number, y1: value.y1 as number };
}

function readLegacyWordsForDiagnostics(data: RawPage): DniWord[] {
  if (!Array.isArray(data.words)) return [];
  return data.words.flatMap((item) => {
    if (!isRecord(item) || !asString(item.text) || !geometryFrom(item.bbox)) return [];
    return [{ text: asString(item.text), confidence: asNumber(item.confidence) ?? undefined, bbox: geometryFrom(item.bbox)! }];
  });
}

function blockSummary(value: unknown) {
  const blocks = Array.isArray(value) ? value : [];
  let paragraphs = 0; let lines = 0; let words = 0;
  for (const block of blocks) {
    if (!isRecord(block)) continue;
    const blockParagraphs = Array.isArray(block.paragraphs) ? block.paragraphs : [];
    paragraphs += blockParagraphs.length;
    for (const paragraph of blockParagraphs) {
      if (!isRecord(paragraph)) continue;
      const paragraphLines = Array.isArray(paragraph.lines) ? paragraph.lines : [];
      lines += paragraphLines.length;
      for (const line of paragraphLines) words += isRecord(line) && Array.isArray(line.words) ? line.words.length : 0;
    }
  }
  const first = isRecord(blocks[0]) ? blocks[0] : undefined;
  return { type: typeOf(value), length: Array.isArray(value) ? value.length : value == null ? null : null, sampleKeys: first ? Object.keys(first) : [], paragraphs, lines, words };
}

function summarizeResult(result: RawResult, options: Record<string, unknown>, output: Record<string, boolean> | undefined, durationMs: number, parsedWords: DniWord[] = [], geometrySource?: DniRawOutputDiagnostics["geometrySource"]): DniRawOutputDiagnostics {
  const data = result.data ?? {};
  const text = asString(data.text);
  const words = readLegacyWordsForDiagnostics(data);
  const blocks = blockSummary(data.blocks);
  const tsv = asString(data.tsv);
  const hocr = asString(data.hocr);
  const tsvLines = tsv ? tsv.split(/\r?\n/).slice(0, 100) : [];
  const wordSource = geometrySource ?? (words.length ? "words" : blocks.words ? "blocks" : tsvLines.length > 1 ? "tsv" : "none");
  return {
    resultKeys: Object.keys(result),
    dataKeys: Object.keys(data),
    textType: typeOf(data.text), textLength: text.length, text,
    confidence: asNumber(data.confidence), blocks,
    tsv: { type: typeOf(data.tsv), length: typeof data.tsv === "string" ? tsv.length : data.tsv == null ? null : null, lines: tsvLines, text: tsvLines.join("\n") },
    hocr: { type: typeOf(data.hocr), length: typeof data.hocr === "string" ? hocr.length : data.hocr == null ? null : null, preview: hocr.slice(0, 500) },
    words: { exists: Object.prototype.hasOwnProperty.call(data, "words"), type: typeOf(data.words), count: Array.isArray(data.words) ? data.words.length : null, sample: words.slice(0, 8).map((word) => ({ text: word.text, confidence: word.confidence ?? null, bbox: word.bbox })) },
    parsedWordCount: parsedWords.length,
    geometrySource: wordSource,
    options: { recognize: options, ...(output ? { output } : {}) }, durationMs,
  };
}

async function rawRecognize(worker: DniWorker, blob: Blob, options: Record<string, unknown> = {}, output?: Record<string, boolean>) {
  const started = performance.now();
  const result = await worker.worker.recognize(blob, options, output);
  return { result, durationMs: Math.round(performance.now() - started) };
}

function recordEvent(engine: DniEngineDiagnostics, status: string, progress: number, started: number) {
  const event: DniWorkerEvent = { status, progress, elapsedMs: Math.round(performance.now() - started) };
  engine.events = [...engine.events.slice(-99), event];
}

export async function createDniWorker(onProgress: (value: number) => void): Promise<DniWorker> {
  const started = performance.now();
  const engine: DniEngineDiagnostics = {
    version: TESSERACT_VERSION, language: "spa", workerCreated: false, createDurationMs: 0, events: [], errors: [], parameters: [],
    cache: { langPath: "default (Tesseract.js)", cachePath: "default (Tesseract.js)", cacheMethod: "default (not overridden)", workerBlobURL: "default (not overridden)" },
  };
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker("spa", 1, {
    logger: (message) => { const progress = Math.round(message.progress * 100); onProgress(progress); recordEvent(engine, message.status, progress, started); },
    errorHandler: (error) => { const text = error instanceof Error ? error.message : String(error); engine.errors = [...engine.errors, text]; },
  });
  engine.workerCreated = true; engine.createDurationMs = Math.round(performance.now() - started);
  return { worker: worker as unknown as Worker, auto: Tesseract.PSM.AUTO, singleLine: Tesseract.PSM.SINGLE_LINE, engine };
}

export async function setOcrMode(worker: DniWorker, mode: string) {
  const values = { tessedit_pageseg_mode: mode, preserve_interword_spaces: "1", tessedit_char_whitelist: LETTERS };
  await worker.worker.setParameters(values);
  worker.engine.parameters = [...worker.engine.parameters, { mode, values }];
}

export async function recognizeVariant(worker: DniWorker, variant: DniImageVariant | { blob: Blob; previewUrl: string }, mode: string, output: Record<string, boolean> = { text: true, tsv: true }) {
  await setOcrMode(worker, mode);
  const recognized = await rawRecognize(worker, variant.blob, {}, output);
  const data = recognized.result.data;
  const tsvWords = parseTesseractTsv(asString(data.tsv));
  const blockWords = flattenTesseractBlocks(data.blocks);
  const words = tsvWords.length ? tsvWords : blockWords;
  const source: DniRawOutputDiagnostics["geometrySource"] = tsvWords.length ? "tsv" : blockWords.length ? "blocks" : "none";
  const diagnostics = summarizeResult(recognized.result, {}, output, recognized.durationMs, words, source);
  return { text: asString(data.text), raw: asString(data.text), confidence: asNumber(data.confidence) ?? 0, words, diagnostics, result: recognized.result, durationMs: recognized.durationMs };
}

export async function diagnoseRecognition(worker: DniWorker, variant: DniImageVariant, mode: string, normal: Awaited<ReturnType<typeof recognizeVariant>>) {
  const a = normal.diagnostics;
  await setOcrMode(worker, mode);
  const blocks = await rawRecognize(worker, variant.blob, {}, { blocks: true });
  await setOcrMode(worker, mode);
  const tsv = await rawRecognize(worker, variant.blob, {}, { tsv: true });
  const blockWords = flattenTesseractBlocks(blocks.result.data.blocks);
  const tsvWords = parseTesseractTsv(asString(tsv.result.data.tsv));
  const tests = { A: a, B: summarizeResult(blocks.result, {}, { blocks: true }, blocks.durationMs, blockWords, blockWords.length ? "blocks" : "none"), C: summarizeResult(tsv.result, {}, { tsv: true }, tsv.durationMs, tsvWords, tsvWords.length ? "tsv" : "none") };
  worker.engine.tests = tests;
  return tests;
}

export async function compareLanguage(variant: DniImageVariant, mode: string): Promise<DniEngineDiagnostics["languageComparison"]> {
  const started = performance.now();
  try {
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("eng", 1);
    await (worker as unknown as Worker).setParameters({ tessedit_pageseg_mode: mode, preserve_interword_spaces: "1" });
    const result = await (worker as unknown as Worker).recognize(variant.blob);
    await (worker as unknown as Worker).terminate();
    const text = asString(result.data.text);
    return { language: "eng", text, textLength: text.length, dataKeys: Object.keys(result.data), durationMs: Math.round(performance.now() - started) };
  } catch (error) {
    return { language: "eng", text: "", textLength: 0, dataKeys: [], durationMs: Math.round(performance.now() - started), error: error instanceof Error ? error.message : String(error) };
  }
}

export { TESSERACT_VERSION };
