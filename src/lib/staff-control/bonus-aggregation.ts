import { activeDays, splitShiftMinutes, weekRange } from "./calendar.ts";
import { validateBonusSettings, validateBonusTiers, type BonusSettings, type BonusTier } from "./bonus-settings.ts";
import type { BonusMetrics } from "./bonus.ts";
import { operationalStaffRoles } from "../auth/operational-staff.ts";

const asRecord = (input: unknown, label: string) => { if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error(`${label} inválido`); return input as Record<string, unknown>; };
const numberField = (record: Record<string, unknown>, key: string) => { if (!Number.isInteger(record[key])) throw new Error(`${key} inválido`); return record[key] as number; };

export type BonusAggregationSource = {
  profiles: Array<{ id: string; rp_name: string; role: "admin" | "ems"; active: boolean }>;
  shifts: Array<{ profile_id: string; started_at: string; ended_at: string | null }>;
  deliveries: Array<{ delivered_by: string | null; occurred_at: string }>;
  fines: Array<{ profile_id: string; fine_amount: number | null }>;
  absences: Array<{ profile_id: string; starts_on: string; ends_on: string }>;
};
export type BonusMetricRow = { profileId: string; rpName: string; metrics: BonusMetrics };

export function mapBonusSettingsRow(input: unknown): BonusSettings {
  const row = asRecord(input, "Configuración de bonos");
  const timeValue = (key: string) => { const value = row[key]; if (typeof value !== "string") throw new Error(`${key} inválido`); return value.slice(0, 5); };
  return validateBonusSettings({
    weeklyGoalMinutes: numberField(row, "weekly_goal_minutes"), peakStart: timeValue("peak_start"), peakEnd: timeValue("peak_end"), activeDayMinimumMinutes: numberField(row, "active_day_minimum_minutes"),
    peakTargetMinutes: numberField(row, "peak_target_minutes"), normalTargetMinutes: numberField(row, "normal_target_minutes"), kitsTarget: numberField(row, "kits_target"), activeDaysTarget: numberField(row, "active_days_target"),
    peakWeight: numberField(row, "peak_weight"), kitsWeight: numberField(row, "kits_weight"), normalWeight: numberField(row, "normal_weight"), consistencyWeight: numberField(row, "consistency_weight"),
    inactivityAlertDays: numberField(row, "inactivity_alert_days"), warnsPerStrike: numberField(row, "warns_per_strike"), criticalStrikes: numberField(row, "critical_strikes"),
  });
}

export function mapBonusTierRow(input: unknown): BonusTier {
  const row = asRecord(input, "Tier");
  const tier = { position: numberField(row, "position"), minScore: numberField(row, "min_score"), maxScore: numberField(row, "max_score"), amount: numberField(row, "amount") };
  if (tier.position < 0 || tier.minScore < 0 || tier.minScore > 100 || tier.maxScore < 0 || tier.maxScore > 100 || tier.maxScore < tier.minScore || tier.amount < 0) throw new Error("Tier inválido");
  return tier;
}

const nextDate = (date: string, days: number) => { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };

export function aggregateWeeklyMetrics(source: BonusAggregationSource, settings: BonusSettings, weekStart: string, zone: string, now = new Date()): BonusMetricRow[] {
  const range = weekRange(new Date(`${weekStart}T12:00:00Z`), zone);
  const weekEnd = nextDate(weekStart, 6);
  return source.profiles.filter((profile) => profile.active && operationalStaffRoles.includes(profile.role)).map((profile) => {
    const shifts = source.shifts.filter((shift) => shift.profile_id === profile.id);
    const split = shifts.map((shift) => splitShiftMinutes({ startedAt: shift.started_at, endedAt: shift.ended_at }, range, { start: settings.peakStart, end: settings.peakEnd }, now, zone));
    const metrics: BonusMetrics = {
      weeklyMinutes: split.reduce((sum, item) => sum + item.totalMinutes, 0),
      peakMinutes: split.reduce((sum, item) => sum + item.peakMinutes, 0),
      normalMinutes: split.reduce((sum, item) => sum + item.normalMinutes, 0),
      kits: source.deliveries.filter((delivery) => delivery.delivered_by === profile.id).length,
      activeDays: activeDays(shifts.map((shift) => ({ startedAt: shift.started_at, endedAt: shift.ended_at })), range, settings.activeDayMinimumMinutes, now, zone),
      activeFineTotal: source.fines.filter((fine) => fine.profile_id === profile.id).reduce((sum, fine) => sum + (fine.fine_amount ?? 0), 0),
      hasRelevantJustifiedAbsence: source.absences.some((absence) => absence.profile_id === profile.id && absence.starts_on <= weekEnd && absence.ends_on >= weekStart),
    };
    return { profileId: profile.id, rpName: profile.rp_name, metrics };
  });
}

export function validateAggregationConfig(settings: BonusSettings, tiers: readonly BonusTier[]) { return { settings: validateBonusSettings(settings), tiers: validateBonusTiers([...tiers]) }; }
