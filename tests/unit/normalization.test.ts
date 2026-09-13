import assert from "node:assert/strict";
import test from "node:test";

import { normalizePersonName, normalizeUsername } from "../../src/lib/normalization/person.ts";
import { toInternalEmail } from "../../src/lib/auth/identity.ts";
import { validatePassword } from "../../src/lib/auth/password.ts";
import { getSupabasePublicConfig } from "../../src/lib/supabase/env.ts";
import { normalizePersonInput, probableDuplicate } from "../../src/lib/people/validation.ts";
import { normalizeBadgeOcrText, parseBadgeNumber } from "../../src/lib/people/plate-ocr.ts";
import { detectPlateRegionFromLuma } from "../../src/lib/people/ocr-image.ts";
import { isDeliverablePolice, validateCivilDelivery } from "../../src/lib/deliveries/validation.ts";
import { buildCivilContent, buildPoliceContent, formatDiscordDate } from "../../src/lib/discord/webhook.ts";
import { formatDate, formatDateTime, formatTime } from "../../src/lib/time/date.ts";

test("normalizeUsername rejects characters outside the login contract", () => {
  assert.throws(() => normalizeUsername("Médico"), /3-32 lowercase characters/);
});

test("normalizeUsername lowercases and trims valid EMS usernames", () => {
  assert.equal(normalizeUsername("  Daniel.EMS  "), "daniel.ems");
});

test("normalizePersonName removes accents and collapses whitespace for search", () => {
  assert.equal(normalizePersonName("  Ábigail   Nguyen "), "abigail nguyen");
  assert.equal(normalizePersonName("  FÉLIX   Armando  "), "felix armando");
  assert.equal(normalizePersonName("21"), "21");
});

test("getSupabasePublicConfig rejects incomplete browser configuration", () => {
  assert.throws(() => getSupabasePublicConfig({ url: "https://example.supabase.co" }), /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
});

test("toInternalEmail uses normalized username and configured internal domain", () => {
  assert.equal(toInternalEmail("  Daniel.EMS  ", "ems.invalid"), "daniel.ems@ems.invalid");
});

test("validatePassword accepts six-character passwords and rejects shorter ones", () => {
  assert.doesNotThrow(() => validatePassword("Admin8"));
  assert.throws(() => validatePassword("Admin"), /at least 6 characters/);
});

test("person validation requires civil INE and normalizes search name", () => {
  const result = normalizePersonInput({ type: "civil", firstName: "  Ana", lastName: "López ", displayName: "Ana López", inePath: "people/a/ine.jpg" });
  assert.equal(result.searchName, "ana lopez ana lopez");
  assert.throws(() => normalizePersonInput({ type: "civil", firstName: "Ana", lastName: "López", displayName: "Ana", inePath: "" }), /INE/);
});

test("police validation allows partial identity and rejects an empty police", () => {
  assert.doesNotThrow(() => normalizePersonInput({ type: "police", firstName: "Ana", lastName: "López", displayName: "Ana", inePath: "ine.jpg" }));
  assert.doesNotThrow(() => normalizePersonInput({ type: "police", firstName: "Ana", lastName: "López", displayName: "Ana", badgeNumber: "214" }));
  assert.doesNotThrow(() => normalizePersonInput({ type: "police", firstName: "Ana", lastName: "López", displayName: "Ana", badgePath: "badge.jpg" }));
  assert.throws(() => normalizePersonInput({ type: "police", firstName: "Ana", lastName: "López", displayName: "Ana" }), /al menos una/);
});

test("badge OCR keeps numeric plate values and ignores decorative text", () => {
  assert.equal(parseBadgeNumber("LOS SANTOS POLICE\n2588"), "2588");
  assert.equal(normalizeBadgeOcrText("  2 5 8 8  "), "");
  assert.equal(parseBadgeNumber("2 5 8 8"), "2588");
});

test("plate detector finds a bright vertical badge and preserves leading zeroes", () => {
  const width = 100; const height = 100; const luma = new Uint8Array(width * height).fill(22);
  for (let y = 10; y < 90; y += 1) for (let x = 35; x < 65; x += 1) luma[y * width + x] = 205;
  const detected = detectPlateRegionFromLuma({ width, height, luma });
  assert.ok(detected.width < detected.height);
  assert.equal(parseBadgeNumber("0626"), "0626");
  assert.equal(parseBadgeNumber(" 0 6 2 6 "), "0626");
});

test("duplicate helper warns for same name or active badge", () => {
  assert.equal(probableDuplicate(1, false), true);
  assert.equal(probableDuplicate(0, true), true);
  assert.equal(probableDuplicate(0, false), false);
});

test("civil delivery validation accepts presets and rejects malformed quantities", () => {
  const input = { personId: "11111111-1111-4111-8111-111111111111", quantityLabel: " 10x10 ", clientRequestId: "22222222-2222-4222-8222-222222222222" };
  assert.equal(validateCivilDelivery(input).quantityLabel, "10x10");
  assert.throws(() => validateCivilDelivery({ ...input, quantityLabel: "muchas vendas" }), /formato/);
  assert.throws(() => validateCivilDelivery({ ...input, quantityLabel: "" }), /formato/);
});

test("police delivery requires active police identity documents", () => {
  const person = { type: "police" as const, archived_at: null, badge_number: "214", ine_path: "ine.jpg", badge_path: "badge.jpg" };
  assert.equal(isDeliverablePolice(person), true);
  assert.equal(isDeliverablePolice({ ...person, type: "civil" }), false);
  assert.equal(isDeliverablePolice({ ...person, archived_at: new Date().toISOString() }), false);
  assert.equal(isDeliverablePolice({ ...person, badge_path: null }), false);
});

test("Discord payload helpers use RP name, type template and local date", () => {
  assert.match(buildCivilContent("Daniel", "Manolo Durango", "13/09/2026", "10x10"), /Atendio:.*Daniel/);
  assert.match(buildPoliceContent("Daniel", "214", "13/09/2026", "10x10"), /Placa:.*214/);
  assert.equal(formatDiscordDate("2026-09-13T12:00:00.000Z"), "13/09/2026");
});

test("timezone helpers use the configured presentation timezone", () => {
  const previous = process.env.APP_TIMEZONE;
  process.env.APP_TIMEZONE = "America/Monterrey";
  assert.equal(formatDate("2026-09-13T05:42:00.000Z"), "12/09/2026");
  assert.equal(formatTime("2026-09-13T05:42:00.000Z"), "23:42");
  assert.equal(formatDateTime("2026-09-13T05:42:00.000Z"), "12/09/2026 23:42");
  process.env.APP_TIMEZONE = previous;
});
