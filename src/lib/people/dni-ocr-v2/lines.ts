import type { DniAnchor, DniBox, DniRow, DniWord } from "./types.ts";

function centerY(word: DniWord) { return (word.bbox.y0 + word.bbox.y1) / 2; }
function height(word: DniWord) { return Math.max(1, word.bbox.y1 - word.bbox.y0); }
function union(words: DniWord[]): DniBox { return { x0: Math.min(...words.map((word) => word.bbox.x0)), x1: Math.max(...words.map((word) => word.bbox.x1)), y0: Math.min(...words.map((word) => word.bbox.y0)), y1: Math.max(...words.map((word) => word.bbox.y1)) }; }
function verticalOverlap(left: DniBox, right: DniBox) { return Math.max(0, Math.min(left.y1, right.y1) - Math.max(left.y0, right.y0)) / Math.max(1, Math.min(left.y1 - left.y0, right.y1 - right.y0)); }

export function clusterWordsIntoRows(words: DniWord[]): DniRow[] {
  const rows: DniRow[] = [];
  const ordered = words.filter((word) => word.text.trim()).sort((left, right) => centerY(left) - centerY(right) || left.bbox.x0 - right.bbox.x0);
  for (const word of ordered) {
    const line = rows.find((row) => Math.abs(row.centerY - centerY(word)) <= Math.max(row.height, height(word)) * 0.65 || verticalOverlap(row.bbox, word.bbox) >= 0.35);
    if (!line) {
      rows.push({ index: rows.length, words: [word], bbox: { ...word.bbox }, centerY: centerY(word), height: height(word) });
      continue;
    }
    line.words.push(word);
    line.words.sort((left, right) => left.bbox.x0 - right.bbox.x0);
    line.bbox = union(line.words);
    line.centerY = (line.bbox.y0 + line.bbox.y1) / 2;
    line.height = Math.max(1, line.bbox.y1 - line.bbox.y0);
  }
  return rows.map((row, index) => ({ ...row, index })).sort((left, right) => left.centerY - right.centerY).map((row, index) => ({ ...row, index }));
}

export function rowForWord(rows: DniRow[], word: DniWord | undefined) { return word ? rows.find((row) => row.words.includes(word)) : undefined; }

export function wordsRightOfAnchor(row: DniRow, anchor: DniAnchor | DniWord) {
  const anchorWord = "word" in anchor ? anchor.word : anchor;
  return row.words.filter((word) => word !== anchorWord && word.bbox.x0 >= anchorWord.bbox.x1).sort((left, right) => left.bbox.x0 - right.bbox.x0);
}
