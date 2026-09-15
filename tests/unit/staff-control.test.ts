import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { previewWarnConversion, validateFineInput } from "../../src/lib/staff-control/actions.ts";
import { activeDays, inactiveCalendarDays, splitShiftMinutes, weekRange, weeklyGoal, type LocalDateRange, type ShiftInterval } from "../../src/lib/staff-control/calendar.ts";
import { attentionPriority, compareStaffAttention, inactivityLabel, staffStatus, strikeProgress, warningProgress, weeklyGoalLabel } from "../../src/lib/staff-control/status.ts";
import { aggregateStaff, parseStaffListQuery, previewWarnAction, type StaffAggregationSource } from "../../src/lib/staff-control/aggregation.ts";
import { conversionNotice, emptyStaffState, fineLabel, generatedStrikeVoidNotice, permissionLabel, staffSearchParams, summaryFilter } from "../../src/lib/staff-control/presentation.ts";

const zone = "America/Monterrey";
const local = (value: string) => new Date(value);
const week = (value: string) => weekRange(local(value), zone);
const shift = (startedAt: string, endedAt: string | null): ShiftInterval => ({ startedAt: local(startedAt), endedAt: endedAt ? local(endedAt) : null });
const peak = { start: "22:00", end: "04:00" };

function split(startedAt: string, endedAt: string | null, range: LocalDateRange = week("2026-09-16T12:00:00Z"), now = local("2026-09-21T06:00:00Z")) {
  return splitShiftMinutes(shift(startedAt, endedAt), range, peak, now, zone);
}

test("warn preview uses the configured threshold", () => {
  assert.deepEqual(previewWarnConversion(2, 3), { willGenerateStrike: true });
  assert.deepEqual(previewWarnConversion(2, 4), { willGenerateStrike: false });
  assert.deepEqual(previewWarnConversion(3, 4), { willGenerateStrike: true });
});

test("staff UI helpers preserve URL filters and explain discipline states", () => {
  assert.equal(summaryFilter("critical"), "critical");
  assert.equal(staffSearchParams(new URLSearchParams("q=Carlos&filter=critical&page=3"), { filter: "goal" }).toString(), "q=Carlos&filter=goal");
  assert.equal(staffSearchParams(new URLSearchParams("q=Carlos&filter=critical&page=3"), { page: 2 }).toString(), "q=Carlos&filter=critical&page=2");
  assert.equal(permissionLabel("2026-09-18"), "Permiso hasta 18 sep");
  assert.equal(fineLabel(5000), "$5,000");
  assert.match(conversionNotice({ willGenerateStrike: true, activeWarnsBefore: 2, activeWarnsAfterOrConversion: 0, warnsPerStrike: 3 }), /convertirán en 1 strike/);
  assert.match(generatedStrikeVoidNotice(2), /warnings anteriores volverán a estar activos/);
  assert.deepEqual(emptyStaffState("Carlos"), { title: "No encontramos personal", description: "No hay coincidencias para “Carlos”." });
});

test("fine requires a positive amount and Monday bonus week", () => {
  assert.deepEqual(validateFineInput({ fineAmount: 5000, appliesToWeek: "2026-09-14" }), { fineAmount: 5000, appliesToWeek: "2026-09-14" });
  assert.throws(() => validateFineInput({ fineAmount: 0, appliesToWeek: "2026-09-14" }), /monto/i);
  assert.throws(() => validateFineInput({ fineAmount: 5000, appliesToWeek: "2026-09-15" }), /lunes/i);
});

test("discipline migration serializes conversion and protects RPC access", () => {
  const sql = readFileSync(new URL("../../supabase/migrations/20260915000000_staff_discipline_and_bonuses.sql", import.meta.url), "utf8");
  assert.match(sql, /create function public\.record_disciplinary_action/i);
  assert.match(sql, /create function public\.void_disciplinary_action/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /security definer\s+set search_path = ''/i);
  assert.match(sql, /fine_amount > 0/i);
  assert.match(sql, /extract\(isodow from applies_to_week\) = 1/i);
  assert.match(sql, /revoke all on function public\.record_disciplinary_action/i);
});

test("week range is Monday-to-Monday at Monterrey local midnight", () => {
  assert.deepEqual(week("2026-09-14T06:00:00Z"), { start: local("2026-09-14T06:00:00Z"), end: local("2026-09-21T06:00:00Z") });
  assert.deepEqual(week("2026-09-21T05:59:59Z"), { start: local("2026-09-14T06:00:00Z"), end: local("2026-09-21T06:00:00Z") });
  assert.deepEqual(week("2027-01-01T03:00:00Z"), { start: local("2026-12-28T06:00:00Z"), end: local("2027-01-04T06:00:00Z") });
  assert.deepEqual(week("2026-10-01T01:00:00Z"), { start: local("2026-09-28T06:00:00Z"), end: local("2026-10-05T06:00:00Z") });
  assert.deepEqual(week("2026-09-21T06:00:00Z"), { start: local("2026-09-21T06:00:00Z"), end: local("2026-09-28T06:00:00Z") });
});

test("peak split conserves every clipped minute across standard intervals", () => {
  assert.deepEqual(split("2026-09-16T03:00:00Z", "2026-09-16T08:00:00Z"), { peakMinutes: 240, normalMinutes: 60, totalMinutes: 300 }); // 21:00–02:00
  assert.deepEqual(split("2026-09-16T05:00:00Z", "2026-09-16T09:00:00Z"), { peakMinutes: 240, normalMinutes: 0, totalMinutes: 240 }); // 23:00–03:00
  assert.deepEqual(split("2026-09-16T09:00:00Z", "2026-09-16T14:00:00Z"), { peakMinutes: 60, normalMinutes: 240, totalMinutes: 300 }); // 03:00–08:00
  assert.deepEqual(split("2026-09-16T04:00:00Z", "2026-09-16T10:00:00Z"), { peakMinutes: 360, normalMinutes: 0, totalMinutes: 360 }); // 22:00–04:00
  assert.deepEqual(split("2026-09-16T02:00:00Z", "2026-09-16T05:00:00Z"), { peakMinutes: 60, normalMinutes: 120, totalMinutes: 180 }); // 20:00–23:00
  assert.deepEqual(split("2026-09-16T10:00:00Z", "2026-09-17T04:00:00Z"), { peakMinutes: 0, normalMinutes: 1080, totalMinutes: 1080 }); // 04:00–22:00
});

test("peak split clips long, cross-week and open shifts before splitting", () => {
  const range = week("2026-09-16T12:00:00Z");
  assert.deepEqual(split("2026-09-13T03:00:00Z", "2026-09-23T12:00:00Z", range), { peakMinutes: 2520, normalMinutes: 7560, totalMinutes: 10080 });
  assert.deepEqual(split("2026-09-14T05:00:00Z", null, range, local("2026-09-14T10:00:00Z")), { peakMinutes: 240, normalMinutes: 0, totalMinutes: 240 });
  assert.deepEqual(split("2026-09-21T05:00:00Z", null, range, local("2026-09-21T06:00:00Z")), { peakMinutes: 60, normalMinutes: 0, totalMinutes: 60 });
});

test("weekly goal has exact 5-hour boundaries and accessible labels", () => {
  assert.deepEqual(weeklyGoal(299, 300), { met: false, currentMinutes: 299, targetMinutes: 300, remainingMinutes: 1, label: "No cumplió meta semanal" });
  assert.equal(weeklyGoal(300, 300).met, true);
  assert.equal(weeklyGoal(301, 300).remainingMinutes, 0);
  assert.equal(weeklyGoalLabel(192, 300), "3h 12m / 5h · No cumplió meta semanal");
});

test("active days accumulate local fragments before applying the threshold", () => {
  const range = week("2026-09-16T12:00:00Z");
  assert.equal(activeDays([shift("2026-09-15T12:00:00Z", "2026-09-15T12:29:00Z")], range, 30, local("2026-09-21T06:00:00Z"), zone), 0);
  assert.equal(activeDays([shift("2026-09-15T12:00:00Z", "2026-09-15T12:10:00Z"), shift("2026-09-15T13:00:00Z", "2026-09-15T13:10:00Z"), shift("2026-09-15T14:00:00Z", "2026-09-15T14:10:00Z")], range, 30, local("2026-09-21T06:00:00Z"), zone), 1);
  assert.equal(activeDays([shift("2026-09-16T05:50:00Z", "2026-09-16T06:20:00Z")], range, 20, local("2026-09-21T06:00:00Z"), zone), 1);
  assert.equal(activeDays([shift("2026-09-16T05:50:00Z", "2026-09-16T06:20:00Z")], range, 30, local("2026-09-21T06:00:00Z"), zone), 0);
  assert.equal(activeDays([shift("2026-09-15T12:00:00Z", "2026-09-15T12:31:00Z")], range, 30, local("2026-09-21T06:00:00Z"), zone), 1);
});

test("inactivity uses calendar days and justified absences pause without creating activity", () => {
  const monday = local("2026-09-14T18:00:00Z");
  const friday = local("2026-09-18T18:00:00Z");
  assert.equal(inactiveCalendarDays(monday, friday, [], zone), 4);
  assert.equal(inactiveCalendarDays(monday, friday, [{ startsOn: "2026-09-15", endsOn: "2026-09-17" }], zone), 1);
  assert.equal(inactiveCalendarDays(monday, friday, [{ startsOn: "2026-09-15", endsOn: "2026-09-16" }, { startsOn: "2026-09-16", endsOn: "2026-09-17" }], zone), 1);
  assert.equal(inactiveCalendarDays(friday, friday, [], zone), 0);
  assert.equal(inactiveCalendarDays(local("2026-09-17T18:00:00Z"), friday, [], zone), 1);
  assert.equal(inactiveCalendarDays(local("2026-09-16T18:00:00Z"), friday, [], zone), 2);
  assert.equal(inactiveCalendarDays(local("2026-09-15T18:00:00Z"), friday, [], zone), 3);
  assert.equal(inactiveCalendarDays(local("2026-09-14T18:00:00Z"), friday, [], zone), 4);
  assert.equal(inactiveCalendarDays(local("2026-09-13T18:00:00Z"), friday, [], zone), 5);
  assert.equal(inactiveCalendarDays(local("2026-09-12T18:00:00Z"), friday, [], zone), 6);
  assert.equal(inactiveCalendarDays(local("2026-09-11T18:00:00Z"), friday, [], zone), 7);
  assert.equal(inactiveCalendarDays(local("2026-09-13T18:00:00Z"), friday, [{ startsOn: "2026-09-14", endsOn: "2026-09-18" }], zone), 0);
  assert.equal(inactiveCalendarDays(monday, friday, [{ startsOn: "2026-09-01", endsOn: "2026-09-13" }], zone), 4);
  assert.equal(inactiveCalendarDays(local("2026-12-29T18:00:00Z"), local("2027-01-03T18:00:00Z"), [{ startsOn: "2026-12-30", endsOn: "2027-01-01" }], zone), 2);
});

test("staff status preserves all reasons and configuration-aware severity", () => {
  assert.equal(staffStatus({ activeStrikes: 0, activeWarns: 0, inactivityDays: 0, weeklyGoalMet: true, warnsPerStrike: 3, criticalStrikes: 3, inactivityThreshold: 3 }).level, "normal");
  assert.equal(staffStatus({ activeStrikes: 1, activeWarns: 0, inactivityDays: 0, weeklyGoalMet: true, warnsPerStrike: 3, criticalStrikes: 3, inactivityThreshold: 3 }).level, "attention");
  assert.equal(staffStatus({ activeStrikes: 2, activeWarns: 0, inactivityDays: 0, weeklyGoalMet: true, warnsPerStrike: 3, criticalStrikes: 3, inactivityThreshold: 3 }).level, "risk");
  assert.equal(staffStatus({ activeStrikes: 0, activeWarns: 0, inactivityDays: 5, weeklyGoalMet: true, warnsPerStrike: 3, criticalStrikes: 3, inactivityThreshold: 3 }).level, "risk");
  const critical = staffStatus({ activeStrikes: 3, activeWarns: 2, inactivityDays: 7, weeklyGoalMet: false, warnsPerStrike: 3, criticalStrikes: 3, inactivityThreshold: 3 });
  assert.equal(critical.level, "critical");
  assert.equal(critical.label, "CRÍTICO");
  assert.match(critical.reasons[0]?.label ?? "", /Strikes 3\/3/);
  assert.equal(critical.reviewLabel, "Revisión administrativa requerida");
  assert.deepEqual(critical.reasons.map((reason) => reason.code), ["critical-strikes", "critical-inactivity", "goal-missed", "warn-near-strike"]);
  assert.equal(staffStatus({ activeStrikes: 0, activeWarns: 3, inactivityDays: 0, weeklyGoalMet: true, warnsPerStrike: 4, criticalStrikes: 3, inactivityThreshold: 3 }).reasons.at(-1)?.label, "Próximo warn → Strike");
  assert.equal(staffStatus({ activeStrikes: 0, activeWarns: 0, inactivityDays: 0, weeklyGoalMet: true, warnsPerStrike: 1, criticalStrikes: 3, inactivityThreshold: 3 }).reasons.length, 0);
});

test("attention priority and tie breaking are deterministic", () => {
  const base = { activeStrikes: 0, activeWarns: 0, inactivityDays: 0, weeklyGoalMet: true, warnsPerStrike: 3, criticalStrikes: 3, inactivityThreshold: 3 };
  assert.ok(attentionPriority({ ...base, activeStrikes: 3 }) < attentionPriority({ ...base, inactivityDays: 7 }));
  assert.ok(attentionPriority({ ...base, inactivityDays: 7 }) < attentionPriority({ ...base, activeStrikes: 2 }));
  assert.ok(attentionPriority({ ...base, activeStrikes: 2 }) < attentionPriority({ ...base, weeklyGoalMet: false }));
  assert.ok(attentionPriority({ ...base, weeklyGoalMet: false }) < attentionPriority({ ...base, inactivityDays: 3 }));
  assert.ok(attentionPriority({ ...base, inactivityDays: 3 }) < attentionPriority({ ...base, activeWarns: 2 }));
  const rows = [
    { id: "b", rpName: "Álvaro", ...base },
    { id: "a", rpName: "Alvaro", ...base },
  ].sort(compareStaffAttention);
  assert.deepEqual(rows.map((row) => row.id), ["a", "b"]);
  assert.equal(inactivityLabel(0), "Activo hoy");
  assert.equal(inactivityLabel(4), "Inactivo · 4 días");
  assert.equal(warningProgress(2, 3).detail, "Próximo warn → Strike");
  assert.equal(strikeProgress(3, 3).detail, "Límite alcanzado");
});

test("staff aggregation searches and filters the complete set before pagination", () => {
  const source: StaffAggregationSource = {
    profiles: [
      { id: "1", username: "normal", rp_name: "Ana", role: "ems", active: true, created_at: "2026-09-01T12:00:00Z" },
      { id: "2", username: "carlos", rp_name: "Carlos", role: "ems", active: true, created_at: "2026-09-16T12:00:00Z" },
      { id: "3", username: "critical", rp_name: "Zeta", role: "ems", active: true, created_at: "2026-09-01T12:00:00Z" },
    ],
    shifts: [{ profile_id: "1", started_at: "2026-09-15T12:00:00Z", ended_at: "2026-09-15T18:00:00Z" }],
    deliveries: [{ delivered_by: "1", occurred_at: "2026-09-15T12:00:00Z" }],
    actions: [
      { id: "fine", profile_id: "2", type: "fine", fine_amount: 5000, applies_to_week: "2026-09-14", voided_at: null },
      { id: "strike-1", profile_id: "3", type: "strike", fine_amount: null, applies_to_week: null, voided_at: null },
      { id: "strike-2", profile_id: "3", type: "strike", fine_amount: null, applies_to_week: null, voided_at: null },
      { id: "strike-3", profile_id: "3", type: "strike", fine_amount: null, applies_to_week: null, voided_at: null },
    ],
    absences: [{ profile_id: "2", starts_on: "2026-09-16", ends_on: "2026-09-18", voided_at: null }],
    settings: { weekly_goal_minutes: 300, warns_per_strike: 3, critical_strikes: 3, inactivity_alert_days: 3 },
  };
  const now = local("2026-09-16T18:00:00Z");
  const all = aggregateStaff(source, parseStaffListQuery({ page: "1", pageSize: "3" }), now);
  assert.equal(all.total, 3);
  assert.equal(all.summary.critical, 1);
  assert.equal(all.items[0]?.profile.id, "3");
  assert.equal(all.items.find((item) => item.profile.id === "2")?.discipline.activeFineTotal, 5000);
  assert.equal(all.items.find((item) => item.profile.id === "2")?.absence.currentlyJustified, true);
  const searched = aggregateStaff(source, parseStaffListQuery({ q: "carlos", page: "1", pageSize: "1" }), now);
  assert.deepEqual(searched.items.map((item) => item.profile.id), ["2"]);
  assert.equal(aggregateStaff(source, parseStaffListQuery({ filter: "critical" }), now).total, 1);
});

test("staff query and warn preview validate only server-safe contracts", () => {
  assert.throws(() => parseStaffListQuery({ filter: "unknown" }), /Filtro inválido/);
  assert.throws(() => parseStaffListQuery({ page: "0" }), /Página inválida/);
  assert.deepEqual(previewWarnAction(2, 3), { activeWarnsBefore: 2, activeWarnsAfterOrConversion: 0, warnsPerStrike: 3, willGenerateStrike: true });
  assert.deepEqual(previewWarnAction(1, 3), { activeWarnsBefore: 1, activeWarnsAfterOrConversion: 2, warnsPerStrike: 3, willGenerateStrike: false });
});
