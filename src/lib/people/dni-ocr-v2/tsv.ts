import type { DniWord } from "./types.ts";

function numberAt(values: string[], index: number): number | undefined {
  const raw = values[index];
  if (raw === undefined || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

const DEFAULT_INDEXES = { level: 0, block: 2, paragraph: 3, line: 4, word: 5, left: 6, top: 7, width: 8, height: 9, confidence: 10, text: 11 };

function indexOfHeader(header: string[], name: string) { return header.indexOf(name); }

export function parseTesseractTsv(tsv: string): DniWord[] {
  if (!tsv.trim()) return [];
  const lines = tsv.split(/\r?\n/).filter((line) => line.length > 0 && line !== "\r");
  if (!lines.length) return [];
  const first = (lines[0] ?? "").replace(/^\uFEFF/, "").split("\t").map((value) => value.trim().toLowerCase());
  const hasHeader = first[0] === "level" && first[1] === "page_num" && first[2] === "block_num";
  const indexes = hasHeader ? {
    level: indexOfHeader(first, "level"), block: indexOfHeader(first, "block_num"), paragraph: indexOfHeader(first, "par_num"), line: indexOfHeader(first, "line_num"), word: indexOfHeader(first, "word_num"), left: indexOfHeader(first, "left"), top: indexOfHeader(first, "top"), width: indexOfHeader(first, "width"), height: indexOfHeader(first, "height"), confidence: indexOfHeader(first, "conf"), text: indexOfHeader(first, "text"),
  } : DEFAULT_INDEXES;
  const dataLines = hasHeader ? lines.slice(1) : lines;
  if (indexes.level < 0 || indexes.text < 0 || indexes.left < 0 || indexes.top < 0 || indexes.width < 0 || indexes.height < 0 || indexes.confidence < 0) return [];
  const words: DniWord[] = [];
  for (const line of dataLines) {
    const values = line.split("\t");
    if (numberAt(values, indexes.level) !== 5) continue;
    const text = values.slice(indexes.text).join("\t").trim();
    const left = numberAt(values, indexes.left); const top = numberAt(values, indexes.top);
    const width = numberAt(values, indexes.width); const height = numberAt(values, indexes.height);
    const confidence = numberAt(values, indexes.confidence);
    if (!text || left === undefined || top === undefined || width === undefined || height === undefined || confidence === undefined || width <= 0 || height <= 0) continue;
    const word: DniWord = { text, confidence, bbox: { x0: left, y0: top, x1: left + width, y1: top + height } };
    const blockNum = numberAt(values, indexes.block); const paragraphNum = numberAt(values, indexes.paragraph); const lineNum = numberAt(values, indexes.line); const wordNum = numberAt(values, indexes.word);
    if (blockNum !== undefined) word.blockNum = blockNum;
    if (paragraphNum !== undefined) word.paragraphNum = paragraphNum;
    if (lineNum !== undefined) word.lineNum = lineNum;
    if (wordNum !== undefined) word.wordNum = wordNum;
    words.push(word);
  }
  return words;
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function numberValue(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }

export function flattenTesseractBlocks(blocks: unknown): DniWord[] {
  if (!Array.isArray(blocks)) return [];
  const words: DniWord[] = [];
  for (const block of blocks) {
    if (!isRecord(block) || !Array.isArray(block.paragraphs)) continue;
    for (const paragraph of block.paragraphs) {
      if (!isRecord(paragraph) || !Array.isArray(paragraph.lines)) continue;
      for (const line of paragraph.lines) {
        if (!isRecord(line) || !Array.isArray(line.words)) continue;
        for (const item of line.words) {
          if (!isRecord(item)) continue;
          const text = typeof item.text === "string" ? item.text.trim() : "";
          const bbox = isRecord(item.bbox) ? item.bbox : undefined;
          const x0 = numberValue(bbox?.x0); const y0 = numberValue(bbox?.y0); const x1 = numberValue(bbox?.x1); const y1 = numberValue(bbox?.y1);
          if (!text || x0 === undefined || y0 === undefined || x1 === undefined || y1 === undefined || x1 <= x0 || y1 <= y0) continue;
          const confidence = numberValue(item.confidence);
          words.push({ text, confidence, bbox: { x0, y0, x1, y1 } });
        }
      }
    }
  }
  return words;
}
