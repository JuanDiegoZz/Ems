import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateBonus,
  formatPesos,
  freezeConfig,
  rankRecommendations,
  type BonusMetrics,
  type BonusSettings,
  type BonusTier,
} from "../../src/lib/staff-control/bonus.ts";
import { validateBonusSettings, validateBonusTiers } from "../../src/lib/staff-control/bonus-settings.ts";

const settings: BonusSettings = {
  weeklyGoalMinutes: 300,
  peakStart: "22:00",
  peakEnd: "04:00",
  activeDayMinimumMinutes: 30,
  peakTargetMinutes: 2520,
  normalTargetMinutes: 600,
  kitsTarget: 25,
  activeDaysTarget: 5,
  peakWeight: 50,
  kitsWeight: 25,
  normalWeight: 10,
  consistencyWeight: 15,
  inactivityAlertDays: 3,
  warnsPerStrike: 3,
  criticalStrikes: 3,
};

const tiers: BonusTier[] = [
  { position: 0, minScore: 85, maxScore: 100, amount: 60000 },
  { position: 1, minScore: 75, maxScore: 84, amount: 55000 },
  { position: 2, minScore: 65, maxScore: 74, amount: 50000 },
  { position: 3, minScore: 50, maxScore: 64, amount: 40000 },
  { position: 4, minScore: 0, maxScore: 49, amount: 20000 },
];

const metrics: BonusMetrics = { weeklyMinutes: 300, peakMinutes: 2520, normalMinutes: 600, kits: 25, activeDays: 5, activeFineTotal: 0, hasRelevantJustifiedAbsence: false };

test("bonus components cap at their configured weights", () => {
  const result = calculateBonus({ ...metrics, weeklyMinutes: 4000, peakMinutes: 4000, normalMinutes: 2000, kits: 100, activeDays: 9 }, settings, tiers);
  assert.deepEqual(result.components, { peak: 50, kits: 25, normal: 10, consistency: 15 });
  assert.equal(result.score, 100);
  assert.equal(result.displayScore, 100);
});

test("each component scores zero, partial, exact target and remains capped above target", () => {
  const cases: Array<[keyof BonusMetrics, number, number, number]> = [["peakMinutes", settings.peakTargetMinutes, settings.peakWeight, settings.peakTargetMinutes], ["kits", settings.kitsTarget, settings.kitsWeight, Math.floor(settings.kitsTarget / 2)], ["normalMinutes", settings.normalTargetMinutes, settings.normalWeight, settings.normalTargetMinutes / 2], ["activeDays", settings.activeDaysTarget, settings.consistencyWeight, Math.floor(settings.activeDaysTarget / 2)]];
  for (const [key, target, weight, half] of cases) {
    const zero = calculateBonus({ ...metrics, [key]: 0 }, settings, tiers);
    const partial = calculateBonus({ ...metrics, [key]: half }, settings, tiers);
    const exact = calculateBonus({ ...metrics, [key]: target }, settings, tiers);
    const over = calculateBonus({ ...metrics, [key]: target * 2 }, settings, tiers);
    assert.equal(zero.components[key === "peakMinutes" ? "peak" : key === "kits" ? "kits" : key === "normalMinutes" ? "normal" : "consistency"], 0);
    assert.equal(partial.components[key === "peakMinutes" ? "peak" : key === "kits" ? "kits" : key === "normalMinutes" ? "normal" : "consistency"], Math.round((half / target) * weight * 1_000_000) / 1_000_000);
    assert.equal(exact.components[key === "peakMinutes" ? "peak" : key === "kits" ? "kits" : key === "normalMinutes" ? "normal" : "consistency"], weight);
    assert.equal(over.components[key === "peakMinutes" ? "peak" : key === "kits" ? "kits" : key === "normalMinutes" ? "normal" : "consistency"], weight);
  }
});

test("configured targets and weights change the calculation without hardcoded defaults", () => {
  const custom = { ...settings, peakTargetMinutes: 1260, peakWeight: 40, kitsWeight: 30, normalWeight: 20, consistencyWeight: 10 };
  const result = calculateBonus({ ...metrics, peakMinutes: 1260 }, custom, tiers);
  assert.equal(result.components.peak, 40);
  assert.equal(result.components.kits, 30);
  assert.equal(result.components.normal, 20);
  assert.equal(result.components.consistency, 10);
});

test("bonus settings and tiers reject invalid persisted configuration", () => {
  assert.deepEqual(validateBonusSettings(settings), settings);
  assert.throws(() => validateBonusSettings({ ...settings, peakWeight: 49 }), /100/);
  assert.throws(() => validateBonusSettings({ ...settings, peakTargetMinutes: 0 }), /peakTargetMinutes/);
  assert.throws(() => validateBonusSettings({ ...settings, activeDayMinimumMinutes: 0 }), /activeDayMinimumMinutes/);
  assert.throws(() => validateBonusSettings({ ...settings, peakStart: "25:00" }), /peakStart/);
  assert.throws(() => validateBonusSettings({ ...settings, peakStart: "22:00", peakEnd: "22:00" }), /peak period/);
  assert.deepEqual(validateBonusTiers(tiers), tiers);
  assert.throws(() => validateBonusTiers([{ ...tiers[0], position: 1 }, ...tiers.slice(1)]), /posicion/i);
  assert.throws(() => validateBonusTiers([{ ...tiers[0], minScore: 86 }, ...tiers.slice(1)]), /gap|cover/i);
  assert.throws(() => validateBonusTiers([{ ...tiers[0], amount: -1 }, ...tiers.slice(1)]), /amount/);
});

test("tier selection uses canonical score, not rounded display score", () => {
  const result = calculateBonus({ ...metrics, peakMinutes: 1763 }, settings, tiers);
  assert.ok(result.score < 85);
  assert.equal(result.displayScore, 85);
  assert.equal(result.baseAmount, 55000);
  assert.equal(calculateBonus({ ...metrics, peakMinutes: 1764 }, settings, tiers).baseAmount, 60000);
});

test("all configured tier boundaries are inclusive at their lower threshold", () => {
  const scoreSettings = { ...settings, peakTargetMinutes: 1_000_000, peakWeight: 100, kitsWeight: 0, normalWeight: 0, consistencyWeight: 0 };
  const at = (score: number) => calculateBonus({ weeklyMinutes: 1, peakMinutes: score * 10_000, normalMinutes: 0, kits: 0, activeDays: 0, activeFineTotal: 0, hasRelevantJustifiedAbsence: false }, scoreSettings, tiers).baseAmount;
  assert.equal(at(100), 60000);
  assert.equal(at(85), 60000);
  assert.equal(at(84.999), 55000);
  assert.equal(at(75), 55000);
  assert.equal(at(74.999), 50000);
  assert.equal(at(65), 50000);
  assert.equal(at(64.999), 40000);
  assert.equal(at(50), 40000);
  assert.equal(at(49.999), 20000);
  assert.equal(at(0), 20000);
});

test("fines reduce recommendation but never make it negative", () => {
  assert.equal(calculateBonus(metrics, settings, tiers).recommendedFinal, 60000);
  assert.equal(calculateBonus({ ...metrics, activeFineTotal: 5000 }, settings, tiers).recommendedFinal, 55000);
  assert.equal(calculateBonus({ ...metrics, activeFineTotal: 60000 }, settings, tiers).recommendedFinal, 0);
  assert.equal(calculateBonus({ ...metrics, activeFineTotal: 90000 }, settings, tiers).recommendedFinal, 0);
  assert.equal(calculateBonus({ ...metrics, activeFineTotal: undefined, fines: 90000 }, settings, tiers).recommendedFinal, 0);
});

test("goal and justified absence produce explicit review reasons", () => {
  const clear = calculateBonus(metrics, settings, tiers);
  assert.equal(clear.reviewRequired, false);
  assert.deepEqual(clear.reviewReasons, []);
  assert.deepEqual(calculateBonus({ ...metrics, weeklyMinutes: 299 }, settings, tiers).reviewReasons, ["WEEKLY_GOAL_NOT_MET"]);
  assert.deepEqual(calculateBonus({ ...metrics, hasRelevantJustifiedAbsence: true }, settings, tiers).reviewReasons, ["JUSTIFIED_ABSENCE"]);
  assert.deepEqual(calculateBonus({ ...metrics, weeklyMinutes: 299, hasRelevantJustifiedAbsence: true }, settings, tiers).reviewReasons, ["WEEKLY_GOAL_NOT_MET", "JUSTIFIED_ABSENCE"]);
});

test("absence and fine inputs default safely when omitted by an older metrics caller", () => {
  const result = calculateBonus({ weeklyMinutes: 300, peakMinutes: 0, normalMinutes: 0, kits: 0, activeDays: 0 }, settings, tiers);
  assert.equal(result.fineTotal, 0);
  assert.deepEqual(result.reviewReasons, []);
});

test("ranking is deterministic and does not alter independent tier money", () => {
  const recommendation = calculateBonus(metrics, settings, tiers);
  const ranked = rankRecommendations([
    { profileId: "b", rpName: "Carlos", recommendation: { ...recommendation, metrics: { ...recommendation.metrics, peakMinutes: 1000 } } },
    { profileId: "c", rpName: "Ãlvaro", recommendation },
    { profileId: "a", rpName: "Alvaro", recommendation },
  ]);
  assert.deepEqual(ranked.map((item) => item.profileId), ["a", "c", "b"]);
  assert.deepEqual(ranked.map((item) => item.rank), [1, 2, 3]);
  assert.equal(ranked[0]?.recommendation.recommendedFinal, ranked[1]?.recommendation.recommendedFinal);
});

test("freezeConfig is JSON-safe, sorted and independent of input mutation", () => {
  const sourceSettings = { ...settings };
  const sourceTiers = [...tiers].reverse();
  const snapshot = freezeConfig(sourceSettings, sourceTiers);
  sourceSettings.peakWeight = 1;
  sourceTiers[0]!.amount = 1;
  assert.equal(JSON.stringify(snapshot).includes("undefined"), false);
  assert.deepEqual(snapshot.tiers.map((tier) => tier.position), [0, 1, 2, 3, 4]);
  assert.equal(snapshot.settings.peakWeight, 50);
  assert.equal(snapshot.tiers[0]?.amount, 60000);
});

test("invalid metrics are rejected and money formatting is presentation-only", () => {
  for (const key of ["weeklyMinutes", "peakMinutes", "normalMinutes", "kits", "activeDays", "activeFineTotal"] as const) {
    assert.throws(() => calculateBonus({ ...metrics, [key]: -1 }, settings, tiers), /non-negative integer/);
  }
  assert.equal(formatPesos(0), "$0");
  assert.equal(formatPesos(5000), "$5,000");
  assert.equal(formatPesos(60000), "$60,000");
});
