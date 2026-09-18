import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { aggregateAdminAnalytics, getAdminAnalyticsRange, percentChange, type AnalyticsSource } from "../../src/lib/analytics/aggregation.ts";

const now = new Date("2026-09-18T18:00:00.000Z");
const settings = {
  active_day_minimum_minutes: 30,
  peak_start: "22:00",
  peak_end: "04:00",
  weekly_goal_minutes: 300,
  warns_per_strike: 3,
  critical_strikes: 3,
  inactivity_alert_days: 3,
};

function source(): AnalyticsSource {
  return {
    profiles: [
      { id: "a", username: "daniel", rp_name: "Daniel", role: "ems", active: true, created_at: "2026-09-01T12:00:00Z" },
      { id: "b", username: "carlos", rp_name: "Carlos", role: "ems", active: true, created_at: "2026-09-01T12:00:00Z" },
      { id: "inactive", username: "old", rp_name: "Old", role: "ems", active: false, created_at: "2026-09-01T12:00:00Z" },
    ],
    shifts: [
      { id: "shift-a", profile_id: "a", started_at: "2026-09-15T04:00:00Z", ended_at: "2026-09-15T08:00:00Z" },
      { id: "shift-b", profile_id: "b", started_at: "2026-09-16T12:00:00Z", ended_at: "2026-09-16T13:00:00Z" },
      { id: "shift-open", profile_id: "a", started_at: "2026-09-18T17:00:00Z", ended_at: null },
    ],
    deliveries: [
      { id: "d1", delivered_by: "a", person_id: "citizen-1", type: "civil", occurred_at: "2026-09-15T07:00:00Z", person: { display_name: "Carlos Martínez", badge_number: null, type: "civil" } },
      { id: "d2", delivered_by: "a", person_id: "citizen-1", type: "civil", occurred_at: "2026-09-15T07:30:00Z", person: { display_name: "Carlos Martínez", badge_number: null, type: "civil" } },
      { id: "d3", delivered_by: "b", person_id: "police-1", type: "police", occurred_at: "2026-09-16T12:30:00Z", person: { display_name: "Oficial García", badge_number: "0012", type: "police" } },
    ],
    actions: [
      { id: "warn", profile_id: "b", type: "warn", fine_amount: null, issued_at: "2026-09-16T14:00:00Z", applies_to_week: null, voided_at: null },
      { id: "fine", profile_id: "b", type: "fine", fine_amount: 5000, issued_at: "2026-09-16T15:00:00Z", applies_to_week: "2026-09-14", voided_at: null },
    ],
    absences: [{ id: "absence", profile_id: "b", starts_on: "2026-09-17", ends_on: "2026-09-18", created_at: "2026-09-17T12:00:00Z", voided_at: null }],
    settings,
    latestFinalizedBonus: {
      weekStart: "2026-09-07",
      results: [
        { profile_id: "a", total_score: 94, final_amount: 60000, recommended_final_amount: 60000, fine_total: 0, override_amount: null, peak_score: 50, kits_score: 24, normal_score: 10, consistency_score: 10, weekly_minutes: 300, peak_minutes: 240, normal_minutes: 60, kits: 4, active_days: 3 },
        { profile_id: "b", total_score: 85, final_amount: 55000, recommended_final_amount: 55000, fine_total: 5000, override_amount: 55000, peak_score: 45, kits_score: 20, normal_score: 10, consistency_score: 10, weekly_minutes: 240, peak_minutes: 180, normal_minutes: 60, kits: 3, active_days: 2 },
      ],
    },
  };
}

test("calendar periods use Monterrey week boundaries and equivalent previous ranges", () => {
  const current = getAdminAnalyticsRange("week", now, "America/Monterrey");
  assert.equal(current.start.toISOString(), "2026-09-14T06:00:00.000Z");
  assert.equal(current.end.toISOString(), "2026-09-21T06:00:00.000Z");
  assert.equal(current.previous.start.toISOString(), "2026-09-07T06:00:00.000Z");
  assert.equal(current.previous.end.toISOString(), "2026-09-14T06:00:00.000Z");
});

test("zero previous totals produce a finite comparison", () => {
  assert.deepEqual(percentChange(12, 0), { value: null, label: "Nuevo" });
  assert.deepEqual(percentChange(0, 0), { value: 0, label: "Sin cambio" });
  assert.deepEqual(percentChange(11, 10), { value: 10, label: "+10%" });
});

test("analytics period input is constrained and the server service requires admin", () => {
  const server = readFileSync(new URL("../../src/server/admin-analytics.ts", import.meta.url), "utf8");
  assert.match(server, /periods: AnalyticsPeriod\[\] = \["week", "previous-week", "7d", "30d"\]/);
  assert.match(server, /await requireAdmin\(\)/);
});

test("team aggregation preserves peak and normal minutes, daily activity and activity count", () => {
  const data = aggregateAdminAnalytics(source(), "7d", now, "America/Monterrey");
  assert.equal(data.kpis.shifts, 3);
  assert.equal(data.kpis.deliveries, 3);
  assert.equal(data.kpis.activityProfiles, 2);
  assert.equal(data.kpis.activeProfiles, 2);
  assert.equal(data.peakNormal.peakMinutes + data.peakNormal.normalMinutes, data.kpis.workedMinutes);
  assert.equal(data.deliveries.byType.civil, 2);
  assert.equal(data.deliveries.byType.police, 1);
  assert.equal(data.daily.reduce((sum, day) => sum + day.deliveries, 0), 3);
});

test("rolling daily buckets clip the first day to the selected period start", () => {
  const input = source();
  input.shifts.push({ id: "boundary", profile_id: "a", started_at: "2026-09-11T12:00:00Z", ended_at: "2026-09-11T20:00:00Z" });
  const data = aggregateAdminAnalytics(input, "7d", now, "America/Monterrey");
  assert.equal(data.daily[0]?.workedMinutes, 120);
});

test("recipient rankings are top five, deterministic and scoped per EMS", () => {
  const data = aggregateAdminAnalytics(source(), "7d", now, "America/Monterrey");
  assert.deepEqual(data.recipients.citizens.map((item) => [item.name, item.count]), [["Carlos Martínez", 2]]);
  assert.deepEqual(data.recipients.police.map((item) => [item.name, item.count, item.badgeNumber]), [["Oficial García", 1, "0012"]]);
  const daniel = data.profiles.find((profile) => profile.profileId === "a");
  assert.equal(daniel?.recipients.citizens[0]?.count, 2);
  assert.equal(daniel?.recipients.police.length, 0);
});

test("recipient ties sort by normalized name and never parse quantity labels", () => {
  const input = source();
  input.deliveries.push(
    { id: "d4", delivered_by: "a", person_id: "citizen-2", type: "civil", occurred_at: "2026-09-15T08:00:00Z", person: { display_name: "Álvaro Ruiz", badge_number: null, type: "civil" } },
    { id: "d5", delivered_by: "a", person_id: "citizen-2", type: "civil", occurred_at: "2026-09-15T08:30:00Z", person: { display_name: "Álvaro Ruiz", badge_number: null, type: "civil" } },
  );
  const data = aggregateAdminAnalytics(input, "7d", now, "America/Monterrey");
  assert.deepEqual(data.recipients.citizens.map((item) => item.name), ["Álvaro Ruiz", "Carlos Martínez"]);
  assert.equal(data.recipients.citizens[0]?.count, 2);
});

test("individual analytics includes current status, open shift and saved finalized bonus breakdown", () => {
  const data = aggregateAdminAnalytics(source(), "7d", now, "America/Monterrey");
  const daniel = data.profiles.find((profile) => profile.profileId === "a");
  assert.equal(daniel?.openShift?.durationMinutes, 60);
  assert.equal(daniel?.bonus?.score, 94);
  assert.deepEqual(daniel?.bonus?.components, { peak: 50, kits: 24, normal: 10, consistency: 10 });
  assert.equal(data.bonus?.label, "Última semana finalizada");
  assert.equal(data.bonus?.overrides, 1);
});
