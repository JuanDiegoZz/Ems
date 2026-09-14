import assert from "node:assert/strict";
import test from "node:test";
import { resolvePasteTarget } from "../../src/lib/people/paste-target.ts";
import { canCheckDuplicates, classifyDuplicate, DuplicateCheckHttpError, duplicateCheckMessage, normalizeDuplicateLookupInput } from "../../src/lib/people/duplicates.ts";
import { normalizePersonName } from "../../src/lib/normalization/person.ts";

test("civil paste always targets the INE", () => {
  assert.equal(resolvePasteTarget("civil", false, false, null), "ine");
  assert.equal(resolvePasteTarget("civil", true, true, "badge"), "ine");
});

test("police paste targets the only missing document", () => {
  assert.equal(resolvePasteTarget("police", false, true, null), "ine");
  assert.equal(resolvePasteTarget("police", true, false, null), "badge");
});

test("police paste is ambiguous when both document slots have the same state", () => {
  assert.equal(resolvePasteTarget("police", false, false, null), "ambiguous");
  assert.equal(resolvePasteTarget("police", true, true, null), "ambiguous");
});

test("an explicitly active police target wins over inferred state", () => {
  assert.equal(resolvePasteTarget("police", false, true, "badge"), "badge");
});

const candidate = { id: "person-1", display_name: "Manolo Durango", type: "civil" as const, badge_number: null };

test("duplicate classification distinguishes duplicate, possible and none", () => {
  assert.equal(classifyDuplicate({ matches: [candidate], possibleMatches: [], badgeMatches: [] }).kind, "duplicate");
  assert.equal(classifyDuplicate({ matches: [], possibleMatches: [candidate], badgeMatches: [] }).kind, "possible");
  assert.equal(classifyDuplicate({ matches: [], possibleMatches: [], badgeMatches: [] }).kind, "none");
});

test("an exact badge match is classified as a badge conflict", () => {
  assert.equal(classifyDuplicate({ matches: [], possibleMatches: [], badgeMatches: [ { ...candidate, type: "police", badge_number: "0626" } ] }).kind, "badge-conflict");
});

test("HTTP 400 duplicate checks are not reported as network failures", () => {
  assert.equal(duplicateCheckMessage(400, { error: "Nombre y apellido son obligatorios" }), "Nombre y apellido son obligatorios");
  assert.equal(duplicateCheckMessage(500, null), "No se pudo comprobar duplicados en el servidor.");
  const error = new DuplicateCheckHttpError(400, { error: "Payload inválido" });
  assert.equal(error.status, 400);
  assert.equal(error.message, "Payload inválido");
});

test("duplicate checks require complete identity fields", () => {
  assert.equal(canCheckDuplicates("Manolo", "", ""), false);
  assert.equal(canCheckDuplicates("Manolo", "Durango", ""), false);
  assert.equal(canCheckDuplicates("Manolo", "Durango", "Manolo Durango"), true);
});

test("duplicate lookup safely handles the real civil MARI HILL payload", () => {
  assert.doesNotThrow(() => normalizeDuplicateLookupInput({ type: "civil", firstName: "MARI", lastName: "HILL", displayName: "MARI HILL", badgeNumber: undefined }));
  const result = normalizeDuplicateLookupInput({ type: "civil", firstName: "MARI", lastName: "HILL", displayName: "MARI HILL", badgeNumber: undefined });
  assert.equal(result.searchName, "mari hill mari hill");
  assert.equal(result.badgeNumber, "");
  assert.equal(normalizeDuplicateLookupInput({ type: "civil", firstName: "MARI", lastName: "HILL", displayName: "MARI HILL", badgeNumber: null }).badgeNumber, "");
  assert.equal(normalizeDuplicateLookupInput({ type: "police", firstName: "Juan", lastName: "Pérez", displayName: "Juan Pérez", badgeNumber: "0626" }).badgeNumber, "0626");
});

test("text normalization is safe for optional values and accents", () => {
  assert.equal(normalizePersonName(undefined), "");
  assert.equal(normalizePersonName(null), "");
  assert.equal(normalizePersonName("MÁRI"), "mari");
});
