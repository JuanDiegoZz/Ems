import { candidateFromRightTokens } from "./candidates.ts";
import type { DniAnchor, DniAnchorDebug, DniLabel, DniRow, DniField, DniWord } from "./types.ts";

function compactLabel(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/0/g, "O").replace(/[^A-Z]/g, ""); }
function editDistance(left: string, right: string) { const row = Array.from({ length: right.length + 1 }, (_, index) => index); for (let i = 1; i <= left.length; i += 1) { let diagonal = row[0]!; row[0] = i; for (let j = 1; j <= right.length; j += 1) { const above = row[j]!; row[j] = left[i - 1] === right[j - 1] ? diagonal : Math.min(above + 1, row[j - 1]! + 1, diagonal + 1); diagonal = above; } } return row[right.length]!; }
const TARGETS: Record<DniLabel, string[]> = { surname: ["APELLIDO", "APELLIDOS"], firstName: ["NOMBRE", "NOMBRES"], birthDate: ["FECHA", "FECHANACIMIENTO"], sex: ["SEXO"], nationality: ["NACIONALIDAD"], document: ["LOSSANTOSDNI"] };

function matchesLabel(value: string, label: DniLabel) {
  const normalized = compactLabel(value);
  return TARGETS[label].some((target) => normalized === target || (target.length >= 5 && editDistance(normalized, target) <= 1));
}

function anchorFromWords(label: DniLabel, words: DniWord[], row: DniRow): DniAnchor | undefined {
  const direct = words.find((word) => matchesLabel(word.text, label));
  if (direct) return { label, word: direct, row };
  for (let length = 3; length >= 2; length -= 1) for (let index = 0; index <= words.length - length; index += 1) {
    const group = words.slice(index, index + length);
    if (matchesLabel(group.map((word) => word.text).join(""), label)) return { label, word: { text: group.map((word) => word.text).join(" "), confidence: Math.min(...group.map((word) => word.confidence ?? 0)), bbox: { x0: group[0]!.bbox.x0, x1: group.at(-1)!.bbox.x1, y0: Math.min(...group.map((word) => word.bbox.y0)), y1: Math.max(...group.map((word) => word.bbox.y1)) } }, row };
  }
  for (let index = 0; index < words.length - 1; index += 1) {
    const pair = words.slice(index, index + 2);
    if (matchesLabel(pair.map((word) => word.text).join(""), label)) return { label, word: { text: pair.map((word) => word.text).join(" "), confidence: Math.min(...pair.map((word) => word.confidence ?? 0)), bbox: { x0: pair[0]!.bbox.x0, x1: pair[1]!.bbox.x1, y0: Math.min(...pair.map((word) => word.bbox.y0)), y1: Math.max(...pair.map((word) => word.bbox.y1)) } }, row };
  }
  return undefined;
}

export function findDocumentAnchors(rows: DniRow[]) {
  const result: Partial<Record<DniLabel, DniAnchor>> = {};
  for (const row of rows) for (const label of Object.keys(TARGETS) as DniLabel[]) if (!result[label]) { const anchor = anchorFromWords(label, row.words, row); if (anchor) result[label] = anchor; }
  return result;
}

export function findFieldValue(rows: DniRow[], anchor: DniAnchor | undefined) {
  if (!anchor) return undefined;
  return candidateFromRightTokens(anchor.row, anchor);
}

export function inferFieldRow(rows: DniRow[], anchors: Partial<Record<DniLabel, DniAnchor>>, field: DniField) {
  const top = field === "surname" ? undefined : anchors.surname;
  const bottom = field === "surname" ? anchors.firstName ?? anchors.birthDate : anchors.birthDate;
  if (!bottom) return undefined;
  const start = top ? top.row.centerY : -Infinity;
  const end = bottom.row.centerY;
  return rows.filter((row) => row.centerY > start && row.centerY < end && !Object.values(anchors).some((anchor) => anchor?.row === row)).at(field === "surname" ? -1 : 0);
}

export function anchorForInferredField(row: DniRow, anchors: Partial<Record<DniLabel, DniAnchor>>, field: DniField): DniAnchor | undefined {
  const source = field === "surname" ? anchors.firstName ?? anchors.birthDate : anchors.surname ?? anchors.birthDate;
  if (!source) return undefined;
  return { label: field, row, word: { text: field === "surname" ? "APELLIDO" : "NOMBRE", confidence: 0, bbox: { x0: source.word.bbox.x0, x1: source.word.bbox.x1, y0: row.bbox.y0, y1: row.bbox.y1 } } };
}

export function diagnoseDocumentAnchors(rows: DniRow[], anchors: Partial<Record<DniLabel, DniAnchor>>) {
  const result = {} as Partial<Record<DniLabel, DniAnchorDebug>>;
  for (const label of Object.keys(TARGETS) as DniLabel[]) {
    const target = TARGETS[label][0]!;
    const seen = new Map<string, DniAnchorDebug["candidates"][number]>();
    for (const row of rows) for (let start = 0; start < row.words.length; start += 1) for (let length = 1; length <= Math.min(3, row.words.length - start); length += 1) {
      const group = row.words.slice(start, start + length); const text = group.map((word) => word.text).join(" "); const normalized = compactLabel(group.map((word) => word.text).join("")); const distance = editDistance(normalized, target); const score = Math.max(0, 100 - distance * 20);
      if (score < 20) continue;
      const candidate = { text, confidence: Math.min(...group.map((word) => word.confidence ?? 0)), score, reason: distance === 0 ? "exact" : `edit distance ${distance}`, rowIndex: row.index, bbox: { x0: group[0]!.bbox.x0, x1: group.at(-1)!.bbox.x1, y0: Math.min(...group.map((word) => word.bbox.y0)), y1: Math.max(...group.map((word) => word.bbox.y1)) } };
      const key = `${row.index}:${candidate.bbox.x0}:${candidate.bbox.x1}:${candidate.text}`; if (!seen.has(key)) seen.set(key, candidate);
    }
    const anchor = anchors[label];
    result[label] = { label, found: Boolean(anchor), matchedText: anchor?.word.text, confidence: anchor?.word.confidence, bbox: anchor?.word.bbox, rowIndex: anchor?.row.index, matchReason: anchor ? (anchor.word.text.includes(" ") ? "grouped label" : "direct/fuzzy label") : undefined, candidates: [...seen.values()].sort((left, right) => right.score - left.score).slice(0, 5) };
  }
  return result;
}

export function findFieldAnchor(rows: DniRow[], anchors: Partial<Record<DniLabel, DniAnchor>>, field: DniField) {
  const direct = anchors[field];
  if (direct) return direct;
  const row = inferFieldRow(rows, anchors, field);
  return row ? anchorForInferredField(row, anchors, field) : undefined;
}

export { matchesLabel };
