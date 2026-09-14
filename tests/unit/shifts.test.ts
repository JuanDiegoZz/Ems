import assert from "node:assert/strict";
import test from "node:test";

import { buildShiftCloseContent, buildShiftOpenContent, decryptWebhook, encryptWebhook, isDiscordWebhookUrl } from "../../src/lib/discord/shift-webhook.ts";
import { getAnalyticsRange, overlapMilliseconds, shiftDurationMilliseconds } from "../../src/lib/shifts/time.ts";

test("shift duration derives from timestamps", () => {
  assert.equal(shiftDurationMilliseconds("2026-09-14T23:00:00.000Z", "2026-09-15T03:00:00.000Z"), 4 * 60 * 60 * 1000);
});

test("overlap counts only the slice inside a range", () => {
  assert.equal(overlapMilliseconds("2026-09-13T22:00:00.000Z", "2026-09-14T03:00:00.000Z", new Date("2026-09-14T00:00:00.000Z"), new Date("2026-09-15T00:00:00.000Z")), 3 * 60 * 60 * 1000);
  assert.equal(overlapMilliseconds("2026-09-12T22:00:00.000Z", "2026-09-13T03:00:00.000Z", new Date("2026-09-14T00:00:00.000Z"), new Date("2026-09-15T00:00:00.000Z")), 0);
});

test("open shifts use now only for calculation", () => {
  assert.equal(overlapMilliseconds("2026-09-14T01:00:00.000Z", null, new Date("2026-09-14T00:00:00.000Z"), new Date("2026-09-14T04:00:00.000Z"), new Date("2026-09-14T03:00:00.000Z")), 2 * 60 * 60 * 1000);
});

test("last 7 days is a rolling interval ending now", () => {
  const now = new Date("2026-09-14T18:00:00.000Z");
  const range = getAnalyticsRange("7d", {}, now);
  assert.ok(range.start);
  assert.equal(range.start.toISOString(), "2026-09-07T18:00:00.000Z");
  assert.equal(range.end.toISOString(), now.toISOString());
});

test("AES-GCM round trips and uses a distinct nonce each time", () => {
  const key = Buffer.alloc(32, 7).toString("base64");
  const one = encryptWebhook("https://discord.com/api/webhooks/1/token", key);
  const two = encryptWebhook("https://discord.com/api/webhooks/1/token", key);
  assert.equal(decryptWebhook(one, key), "https://discord.com/api/webhooks/1/token");
  assert.notEqual(one.ciphertext, two.ciphertext);
  assert.throws(() => encryptWebhook("x", "bad"), /EMS_WEBHOOK_ENCRYPTION_KEY/);
});

test("shift Discord messages include the required operational fields", () => {
  assert.match(buildShiftOpenContent("Daniel", "14/09/2026 20:31"), /Bitácora EMS abierta[\s\S]*Daniel[\s\S]*En servicio/);
  assert.match(buildShiftCloseContent("Daniel", "14/09/2026 20:31", "15/09/2026 01:12", "04h 41m"), /Bitácora EMS cerrada[\s\S]*01:12[\s\S]*04h 41m/);
});

test("only Discord webhook URLs are accepted", () => {
  assert.equal(isDiscordWebhookUrl("https://discord.com/api/webhooks/123456/token_value"), true);
  assert.equal(isDiscordWebhookUrl("https://example.com/api/webhooks/123/token"), false);
});
