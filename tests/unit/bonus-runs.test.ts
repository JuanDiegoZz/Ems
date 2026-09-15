import assert from "node:assert/strict";
import test from "node:test";

import { aggregateWeeklyMetrics, mapBonusSettingsRow, mapBonusTierRow, type BonusAggregationSource } from "../../src/lib/staff-control/bonus-aggregation.ts";
import type { BonusSettings } from "../../src/lib/staff-control/bonus-settings.ts";

const settings: BonusSettings = {
  weeklyGoalMinutes: 300, peakStart: "22:00", peakEnd: "04:00", activeDayMinimumMinutes: 30,
  peakTargetMinutes: 2520, normalTargetMinutes: 600, kitsTarget: 25, activeDaysTarget: 5,
  peakWeight: 50, kitsWeight: 25, normalWeight: 10, consistencyWeight: 15,
  inactivityAlertDays: 3, warnsPerStrike: 3, criticalStrikes: 3,
};

test("maps persisted snake_case bonus configuration to the domain contract", () => {
  assert.deepEqual(mapBonusSettingsRow({ weekly_goal_minutes: 300, peak_start: "22:00:00", peak_end: "04:00:00", active_day_minimum_minutes: 30, peak_target_minutes: 2520, normal_target_minutes: 600, kits_target: 25, active_days_target: 5, peak_weight: 50, kits_weight: 25, normal_weight: 10, consistency_weight: 15, inactivity_alert_days: 3, warns_per_strike: 3, critical_strikes: 3 }), settings);
  assert.deepEqual(mapBonusTierRow({ position: 0, min_score: 85, max_score: 100, amount: 60000 }), { position: 0, minScore: 85, maxScore: 100, amount: 60000 });
});

test("aggregates one bounded weekly metric set per EMS", () => {
  const source: BonusAggregationSource = {
    profiles: [{ id: "a", rp_name: "Ana", role: "ems", active: true }, { id: "b", rp_name: "Bruno", role: "admin", active: true }],
    shifts: [{ profile_id: "a", started_at: "2026-09-14T06:00:00Z", ended_at: "2026-09-14T07:00:00Z" }],
    deliveries: [{ delivered_by: "a", occurred_at: "2026-09-14T07:00:00Z" }, { delivered_by: "a", occurred_at: "2026-09-14T08:00:00Z" }],
    fines: [{ profile_id: "a", fine_amount: 5000 }],
    absences: [{ profile_id: "b", starts_on: "2026-09-15", ends_on: "2026-09-16" }],
  };
  const rows = aggregateWeeklyMetrics(source, settings, "2026-09-14", "America/Monterrey");
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.find((row) => row.profileId === "a")?.metrics, { weeklyMinutes: 60, peakMinutes: 60, normalMinutes: 0, kits: 2, activeDays: 1, activeFineTotal: 5000, hasRelevantJustifiedAbsence: false });
  assert.equal(rows.find((row) => row.profileId === "b")?.metrics.hasRelevantJustifiedAbsence, true);
});
