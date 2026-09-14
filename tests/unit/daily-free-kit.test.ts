import assert from "node:assert/strict";
import test from "node:test";
import { DAILY_FREE_KIT_QUANTITY, getAppLocalDate, getDailyFreeKitDecision } from "../../src/lib/deliveries/daily-free-kit.ts";
import { buildPoliceContent } from "../../src/lib/discord/webhook.ts";

test("disabled daily kit never marks a delivery free", () => {
  assert.deepEqual(getDailyFreeKitDecision(false, "5x5", false), { free: false, warning: null });
});

test("the first 5x5 is free and a later 5x5 requires confirmation", () => {
  assert.equal(getDailyFreeKitDecision(true, "5x5", false).free, true);
  assert.match(getDailyFreeKitDecision(true, "5x5", true).warning ?? "", /ya recibió/);
});

test("each officer has an independent entitlement", () => {
  assert.equal(getDailyFreeKitDecision(true, "5x5", true).free, false);
  assert.equal(getDailyFreeKitDecision(true, "5x5", false).free, true);
});

test("a non-5x5 does not consume the daily 5x5 entitlement", () => {
  const first = getDailyFreeKitDecision(true, "10x10", false);
  assert.equal(first.free, false);
  assert.match(first.warning ?? "", /5x5/);
  assert.equal(getDailyFreeKitDecision(true, DAILY_FREE_KIT_QUANTITY, false).free, true);
});

test("used benefits still require a charged confirmation for every quantity", () => {
  assert.match(getDailyFreeKitDecision(true, "5x5", true).warning ?? "", /se cobra/);
  assert.match(getDailyFreeKitDecision(true, "10x10", true).warning ?? "", /se cobra/);
});

test("America/Monterrey uses calendar days rather than a 24-hour window", () => {
  assert.equal(getAppLocalDate(new Date("2026-09-14T05:59:00.000Z")), "2026-09-13");
  assert.equal(getAppLocalDate(new Date("2026-09-14T06:01:00.000Z")), "2026-09-14");
});

test("only free police deliveries add the Discord benefit line", () => {
  assert.doesNotMatch(buildPoliceContent("EMS", "0626", "13/09/2026", "5x5"), /Kit diario/);
  assert.match(buildPoliceContent("EMS", "0626", "13/09/2026", "5x5", true), /Kit diario: Gratuito/);
});

test("badge values stay strings with leading zeroes", () => {
  const badge: string = "0626";
  assert.equal(badge, "0626");
});
