import type { DniCandidate, DniAnchor, DniRow, DniWord } from "./types.ts";
import { wordsRightOfAnchor } from "./lines.ts";

const LABELS = new Set(["APELLIDO", "APELLIDOS", "NOMBRE", "NOMBRES", "FECHA", "NACIMIENTO", "SEXO", "NACIONALIDAD", "DOMICILIO", "CURP"]);

export function normalizeIdentityText(value: string) {
  return value.replace(/[|¦]/g, "I").replace(/[“”]/g, "").replace(/^[\s:;,\.\-]+|[\s:;,\.\-]+$/g, "").replace(/\s+/g, " ").trim();
}

function compact(value: string) { return normalizeIdentityText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/0/g, "O").replace(/[^A-Z]/g, ""); }

export function isValidIdentityText(value: string) {
  const text = normalizeIdentityText(value);
  const normalized = compact(text);
  if (!text || text.length > 64 || LABELS.has(normalized)) return false;
  if (/\d|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(text)) return false;
  if (/^LOS\s+SANT/i.test(text) || /\b(?:FECHA|NACIMIENTO|NACIONALIDAD|SEXO|APELLIDO|NOMBRE)\b/i.test(text)) return false;
  return /^[\p{L}\s'’-]+$/u.test(text) && /\p{L}/u.test(text);
}

export function candidateFromRightTokens(row: DniRow, anchor: DniAnchor, source: DniCandidate["source"] = "tokens", pass?: string): DniCandidate | undefined {
  const words = wordsRightOfAnchor(row, anchor).filter((word) => /\p{L}/u.test(word.text));
  const text = normalizeIdentityText(words.map((word) => word.text).join(" "));
  if (!isValidIdentityText(text)) return undefined;
  return { text, confidence: words.reduce((sum, word) => sum + (word.confidence ?? 0), 0) / Math.max(1, words.length), geometry: 1, repetitions: 1, source, pass };
}

export function wordsForCandidate(row: DniRow, anchor: DniAnchor): DniWord[] { return wordsRightOfAnchor(row, anchor).filter((word) => /\p{L}/u.test(word.text)); }
