import assert from "node:assert/strict";
import test from "node:test";

import { clusterWordsIntoRows, wordsRightOfAnchor } from "../../src/lib/people/dni-ocr-v2/lines.ts";
import { findDocumentAnchors, findFieldValue } from "../../src/lib/people/dni-ocr-v2/anchors.ts";
import { chooseIdentityCandidate, scoreIdentityCandidate } from "../../src/lib/people/dni-ocr-v2/scoring.ts";
import { flattenTesseractBlocks, parseTesseractTsv } from "../../src/lib/people/dni-ocr-v2/tsv.ts";
import { anchorsFollowDocumentOrder } from "../../src/lib/people/dni-ocr-v2/index.ts";
import type { DniWord } from "../../src/lib/people/dni-ocr-v2/types.ts";

function word(text: string, x0: number, x1: number, y0: number, y1: number, confidence = 94): DniWord {
  return { text, confidence, bbox: { x0, x1, y0, y1 } };
}

function fixture(scale = 1, dx = 0, dy = 0): DniWord[] {
  const rows = [
    [word("APELLIDO", 220, 310, 100, 122), word("DE", 430, 455, 101, 121), word("LA", 465, 490, 101, 121), word("TORRE", 500, 570, 101, 121)],
    [word("NOMBRE", 220, 300, 145, 167), word("JUAN", 430, 480, 146, 166), word("CARLOS", 490, 560, 146, 166)],
    [word("FECHA", 220, 275, 200, 222), word("DE", 280, 305, 200, 222), word("NACIMIENTO", 310, 430, 200, 222), word("10/09/2000", 450, 550, 201, 221)],
    [word("SEXO", 220, 270, 250, 272), word("F", 450, 465, 251, 271)],
    [word("NACIONALIDAD", 220, 360, 300, 322), word("LOS", 450, 485, 301, 321), word("SANTOS", 490, 565, 301, 321)],
  ].flat();
  return rows.map((item) => ({ ...item, bbox: { x0: item.bbox.x0 * scale + dx, x1: item.bbox.x1 * scale + dx, y0: item.bbox.y0 * scale + dy, y1: item.bbox.y1 * scale + dy } }));
}

test("V2 extracts values from the same row and never from nationality", () => {
  const rows = clusterWordsIntoRows(fixture());
  const anchors = findDocumentAnchors(rows);
  assert.equal(findFieldValue(rows, anchors.surname)?.text, "DE LA TORRE");
  assert.equal(findFieldValue(rows, anchors.firstName)?.text, "JUAN CARLOS");
  assert.notEqual(findFieldValue(rows, anchors.firstName)?.text, "LOS SANTOS");
});

test("V2 is invariant to coordinate scale and translation", () => {
  for (const [scale, dx, dy] of [[0.5, 200, 100], [2, 17, 33], [1.25, -20, 80]]) {
    const rows = clusterWordsIntoRows(fixture(scale, dx, dy));
    const anchors = findDocumentAnchors(rows);
    assert.equal(findFieldValue(rows, anchors.surname)?.text, "DE LA TORRE");
    assert.equal(findFieldValue(rows, anchors.firstName)?.text, "JUAN CARLOS");
  }
});

test("V2 supports fuzzy and split labels without fuzzy-correcting values", () => {
  const words = [
    word("APEL", 100, 145, 10, 30), word("LIDO", 150, 200, 10, 30), word("BRIGANTE", 300, 390, 11, 29),
    word("N0MBRE", 100, 180, 45, 65), word("CARLITO", 300, 375, 46, 64),
  ];
  const anchors = findDocumentAnchors(clusterWordsIntoRows(words));
  assert.equal(findFieldValue(clusterWordsIntoRows(words), anchors.surname)?.text, "BRIGANTE");
  assert.equal(findFieldValue(clusterWordsIntoRows(words), anchors.firstName)?.text, "CARLITO");
});

test("V2 scoring favors geometry and repeated clean candidates", () => {
  const wrong = scoreIdentityCandidate({ text: "LOS SANTI", confidence: 99, geometry: 0, repetitions: 1 });
  const right = scoreIdentityCandidate({ text: "WILL", confidence: 86, geometry: 1, repetitions: 2 });
  assert.equal(wrong.accepted, false);
  assert.equal(right.accepted, true);
  assert.equal(chooseIdentityCandidate([wrong, right])?.text, "WILL");
});

test("V2 exposes right-side words in x order only", () => {
  const rows = clusterWordsIntoRows([
    word("NOMBRE", 100, 180, 20, 40), word("ATENA", 300, 350, 21, 39), word("RUIDO", 80, 95, 21, 39), word("ABAJO", 300, 350, 80, 100),
  ]);
  const anchor = findDocumentAnchors(rows).firstName;
  assert.deepEqual(wordsRightOfAnchor(anchor!.row, anchor!.word).map((item) => item.text), ["ATENA"]);
});

test("V2 regression fixtures resolve names without hardcoded values", () => {
  const fixtures = [["BRIGANTE", "CARLITO"], ["MADRID", "SERGIO"], ["SMITH", "WILL"], ["MAILS", "MALCOM"], ["CANDELARIA", "CRUZ"], ["NOVOA", "ATENA"], ["DON", "BENY"], ["VOLKOV", "ALEXIS"], ["GARZA", "LUIS"], ["BLANCON", "ZACARIAS"], ["FELIX", "ARMANDO"]];
  for (const [surname, firstName] of fixtures) {
    const rows = clusterWordsIntoRows([word("APELLIDO", 10, 90, 20, 40), word(surname, 130, 130 + surname.length * 10, 21, 39), word("NOMBRE", 10, 80, 60, 80), word(firstName, 130, 130 + firstName.length * 10, 61, 79)]);
    const anchors = findDocumentAnchors(rows);
    assert.equal(findFieldValue(rows, anchors.surname)?.text, surname);
    assert.equal(findFieldValue(rows, anchors.firstName)?.text, firstName);
  }
});

test("V2 rejects an anchor sequence that violates document row order", () => {
  const rows = clusterWordsIntoRows([word("APELLIDO", 10, 90, 20, 40), word("SMITH", 130, 180, 21, 39), word("NACIONALIDAD", 10, 120, 60, 80), word("LOS", 130, 160, 61, 79), word("SANTOS", 165, 220, 61, 79), word("NOMBRE", 10, 80, 100, 120), word("WILL", 130, 170, 101, 119)]);
  assert.equal(anchorsFollowDocumentOrder(findDocumentAnchors(rows)), false);
});

const TSV_HEADER = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext";
const SMITH_WILL_HEADERLESS = [
  "1\t1\t0\t0\t0\t0\t0\t0\t1920\t1080\t-1\t",
  "2\t1\t3\t0\t0\t0\t480\t220\t800\t180\t-1\t",
  "3\t1\t3\t1\t0\t0\t490\t230\t760\t130\t-1\t",
  "4\t1\t3\t1\t1\t0\t495\t233\t700\t40\t-1\t",
  "5\t1\t3\t1\t1\t1\t495\t233\t152\t39\t95.332138\tAPELLIDO",
  "5\t1\t3\t1\t1\t2\t1075\t233\t82\t20\t95.801399\tSMITH",
  "5\t1\t5\t1\t1\t1\t496\t305\t136\t23\t96.395035\tNOMBRE",
  "5\t1\t5\t1\t1\t2\t1098\t301\t60\t19\t95.340912\tWILL",
].join("\n");

test("TSV headerless real fixture parses exactly SMITH and WILL words", () => {
  const words = parseTesseractTsv(SMITH_WILL_HEADERLESS);
  assert.equal(words.length, 4);
  assert.deepEqual(words.map((item) => item.text), ["APELLIDO", "SMITH", "NOMBRE", "WILL"]);
  assert.deepEqual(words[0]?.bbox, { x0: 495, y0: 233, x1: 647, y1: 272 });
  assert.deepEqual(words[1]?.bbox, { x0: 1075, y0: 233, x1: 1157, y1: 253 });
  assert.deepEqual(words[2]?.bbox, { x0: 496, y0: 305, x1: 632, y1: 328 });
  assert.deepEqual(words[3]?.bbox, { x0: 1098, y0: 301, x1: 1158, y1: 320 });
});

test("TSV headerless fixture integrates with rows, anchors and right-side extraction", () => {
  const rows = clusterWordsIntoRows(parseTesseractTsv(SMITH_WILL_HEADERLESS));
  const anchors = findDocumentAnchors(rows);
  assert.equal(findFieldValue(rows, anchors.surname)?.text, "SMITH");
  assert.equal(findFieldValue(rows, anchors.firstName)?.text, "WILL");
});

test("TSV parser maps word-level geometry and metadata", () => {
  const tsv = [
    TSV_HEADER,
    "4\t1\t1\t1\t1\t1\t10\t10\t90\t20\t99\tline",
    "5\t1\t2\t3\t4\t1\t220\t100\t80\t20\t96\tAPELLIDO",
    "5\t1\t2\t3\t4\t2\t450\t101\t60\t19\t92\tNOVOA",
    "5\t1\t2\t3\t5\t1\t220\t145\t70\t20\t-1\tNOMBRE",
    "5\t1\t2\t3\t5\t2\t450\t146\t55\t19\t88\tATENA",
    "5\t1\t2\t3\t7\t1\t220\t250\t70\t20\t90\t\u00c1NGELES",
    "5\t1\t2\t3\t8\t1\t220\t300\t120\t20\t90\tDE LA CRUZ",
    "5\t1\t2\t3\t6\t1\t220\t200\t0\t20\t80\tINVALID",
    "5\t1\t2\t3\t6\t2\t220\t200\t40\t20\tNaN\tVACIO",
  ].join("\n");
  const words = parseTesseractTsv(tsv);
  assert.deepEqual(words.map((item) => item.text), ["APELLIDO", "NOVOA", "NOMBRE", "ATENA", "ÁNGELES", "DE LA CRUZ"]);
  assert.deepEqual(words[1]?.bbox, { x0: 450, y0: 101, x1: 510, y1: 120 });
  assert.equal(words[2]?.confidence, -1);
  assert.deepEqual(words[0], { text: "APELLIDO", confidence: 96, bbox: { x0: 220, y0: 100, x1: 300, y1: 120 }, blockNum: 2, paragraphNum: 3, lineNum: 4, wordNum: 1 });
});

test("TSV geometry feeds the existing V2 row and anchor pipeline", () => {
  const tsv = [
    TSV_HEADER,
    "5\t1\t1\t1\t1\t1\t220\t100\t80\t20\t95\tAPELLIDO",
    "5\t1\t1\t1\t1\t2\t450\t101\t60\t19\t94\tNOVOA",
    "5\t1\t1\t1\t2\t1\t220\t145\t70\t20\t95\tNOMBRE",
    "5\t1\t1\t1\t2\t2\t450\t146\t55\t19\t94\tATENA",
  ].join("\n");
  const words = parseTesseractTsv(tsv);
  const rows = clusterWordsIntoRows(words);
  const anchors = findDocumentAnchors(rows);
  assert.equal(findFieldValue(rows, anchors.surname)?.text, "NOVOA");
  assert.equal(findFieldValue(rows, anchors.firstName)?.text, "ATENA");
});

test("TSV parsing is stable for multiple regression names", () => {
  for (const [surname, firstName] of [["SMITH", "WILL"], ["CANDELARIA", "CRUZ"]]) {
    const tsv = [
      TSV_HEADER,
      `5\t1\t1\t1\t1\t1\t10\t20\t80\t20\t95\tAPELLIDO`,
      `5\t1\t1\t1\t1\t2\t130\t21\t${surname.length * 10}\t19\t94\t${surname}`,
      `5\t1\t1\t1\t2\t1\t10\t60\t70\t20\t95\tNOMBRE`,
      `5\t1\t1\t1\t2\t2\t130\t61\t${firstName.length * 10}\t19\t94\t${firstName}`,
    ].join("\n");
    const rows = clusterWordsIntoRows(parseTesseractTsv(tsv));
    const anchors = findDocumentAnchors(rows);
    assert.equal(findFieldValue(rows, anchors.surname)?.text, surname);
    assert.equal(findFieldValue(rows, anchors.firstName)?.text, firstName);
  }
});

test("blocks fallback flattens nested Tesseract geometry", () => {
  const words = flattenTesseractBlocks([{ paragraphs: [{ lines: [{ words: [{ text: "NOVOA", confidence: 91, bbox: { x0: 10, y0: 20, x1: 60, y1: 40 } }] }] }] }]);
  assert.deepEqual(words, [{ text: "NOVOA", confidence: 91, bbox: { x0: 10, y0: 20, x1: 60, y1: 40 } }]);
});
