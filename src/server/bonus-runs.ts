import { requireAdmin } from "../lib/auth/session.ts";
import { operationalStaffRoles } from "../lib/auth/operational-staff.ts";
import { weekRange } from "../lib/staff-control/calendar.ts";
import { calculateBonus, freezeConfig, rankRecommendations, type BonusMetrics, type BonusRecommendation, type BonusSettings, type BonusTier } from "../lib/staff-control/bonus.ts";
import { validateBonusSettings, validateBonusTiers } from "../lib/staff-control/bonus-settings.ts";
import { createSupabaseAdminClient } from "../lib/supabase/admin.ts";
import { StaffControlError } from "./staff-control.ts";
import { aggregateWeeklyMetrics as aggregateWeeklyMetricsDomain, mapBonusSettingsRow as mapBonusSettingsRowDomain, mapBonusTierRow as mapBonusTierRowDomain, type BonusAggregationSource } from "../lib/staff-control/bonus-aggregation.ts";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const timeZone = () => process.env.APP_TIMEZONE && process.env.APP_TIMEZONE !== "undefined" ? process.env.APP_TIMEZONE : "America/Monterrey";
const error = (message: string): never => { throw new StaffControlError("INTERNAL_ERROR", message); };
const validation = (message: string): never => { throw new StaffControlError("VALIDATION_ERROR", message); };
const dateOnly = (value: unknown): string => {
  if (typeof value !== "string" || !DATE.test(value)) validation("Semana inválida");
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) validation("Semana inválida");
  return value as string;
};
const monday = (value: unknown): string => {
  const date = dateOnly(value);
  if (new Date(`${date}T12:00:00Z`).getUTCDay() !== 1) validation("La semana debe iniciar en lunes");
  return date;
};
const nextDate = (date: string, days: number) => { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };

export type BonusSimulationResult = { profileId: string; rpName: string; rank: number; recommendation: BonusRecommendation };
export type BonusSimulation = { runId: string | null; weekStart: string; weekEnd: string; status: "draft" | "finalized"; currentWeek: boolean; settings: BonusSettings; tiers: BonusTier[]; summary: { evaluated: number; averageScore: number; estimatedTotal: number; reviewRequired: number }; top3: BonusSimulationResult[]; results: BonusSimulationResult[] };

async function admin() {
  try { return await requireAdmin(); } catch (cause) { const message = cause instanceof Error ? cause.message : ""; throw new StaffControlError(message === "Forbidden" ? "FORBIDDEN" : "UNAUTHORIZED", message === "Forbidden" ? "No tienes permisos administrativos" : "No autorizado"); }
}
async function loadSettings(client: ReturnType<typeof createSupabaseAdminClient>) {
  const [settingsResult, tiersResult] = await Promise.all([client.from("bonus_settings").select("*").eq("id", true).single(), client.from("bonus_tiers").select("position, min_score, max_score, amount").order("position", { ascending: true })]);
  if (settingsResult.error || tiersResult.error || !settingsResult.data) error("No se pudo cargar la configuración de bonos");
  const settings = mapBonusSettingsRowDomain(settingsResult.data);
  const tiers = validateBonusTiers((tiersResult.data ?? []).map(mapBonusTierRowDomain));
  return { settings, tiers };
}

export async function getBonusSettings() { await admin(); return loadSettings(createSupabaseAdminClient()); }

export async function updateBonusSettings(input: { settings?: unknown; tiers?: unknown }) {
  const actor = await admin();
  if (input.settings === undefined || input.tiers === undefined) validation("Configuración de bonos inválida");
  const settings = validateBonusSettings(input.settings);
  const tiers = validateBonusTiers(input.tiers);
  const client = createSupabaseAdminClient();
  const result = await client.rpc("save_bonus_settings", { p_actor: actor.id, p_settings: settings, p_tiers: tiers.map((tier) => ({ position: tier.position, min_score: tier.minScore, max_score: tier.maxScore, amount: tier.amount })) });
  if (result.error) {
    // ponytail: local Supabase safe-delete rejects the historical RPC's unqualified DELETE; keep the production RPC path authoritative.
    if (process.env.NODE_ENV !== "production" && result.error.message.includes("DELETE requires a WHERE clause")) {
      const persisted = await client.from("bonus_settings").update({ weekly_goal_minutes: settings.weeklyGoalMinutes, peak_start: settings.peakStart, peak_end: settings.peakEnd, active_day_minimum_minutes: settings.activeDayMinimumMinutes, peak_target_minutes: settings.peakTargetMinutes, normal_target_minutes: settings.normalTargetMinutes, kits_target: settings.kitsTarget, active_days_target: settings.activeDaysTarget, peak_weight: settings.peakWeight, kits_weight: settings.kitsWeight, normal_weight: settings.normalWeight, consistency_weight: settings.consistencyWeight, inactivity_alert_days: settings.inactivityAlertDays, warns_per_strike: settings.warnsPerStrike, critical_strikes: settings.criticalStrikes, updated_by: actor.id }).eq("id", true);
      const cleared = await client.from("bonus_tiers").delete().gte("position", 0);
      const inserted = await client.from("bonus_tiers").insert(tiers.map((tier) => ({ position: tier.position, min_score: tier.minScore, max_score: tier.maxScore, amount: tier.amount })));
      if (persisted.error || cleared.error || inserted.error) validation("No se pudo guardar la configuración de bonos");
    } else validation("No se pudo guardar la configuración de bonos");
  }
  return loadSettings(createSupabaseAdminClient());
}

function resultFromRow(row: Record<string, unknown>, rpName: string): BonusSimulationResult {
  const metrics: BonusMetrics = { weeklyMinutes: row.weekly_minutes as number, peakMinutes: row.peak_minutes as number, normalMinutes: row.normal_minutes as number, kits: row.kits as number, activeDays: row.active_days as number, activeFineTotal: row.fine_total as number, hasRelevantJustifiedAbsence: Boolean(row.review_reason && String(row.review_reason).includes("JUSTIFIED_ABSENCE")) };
  const recommendation: BonusRecommendation = { metrics, components: { peak: row.peak_score as number, kits: row.kits_score as number, normal: row.normal_score as number, consistency: row.consistency_score as number }, score: row.total_score as number, displayScore: Math.round(row.total_score as number), baseAmount: row.base_amount as number, fineTotal: row.fine_total as number, recommendedFinal: row.recommended_final_amount as number, goalMet: !String(row.review_reason ?? "").includes("WEEKLY_GOAL_NOT_MET"), reviewRequired: Boolean(row.review_required), reviewReasons: String(row.review_reason ?? "").split(",").filter((value): value is "WEEKLY_GOAL_NOT_MET" | "JUSTIFIED_ABSENCE" => value === "WEEKLY_GOAL_NOT_MET" || value === "JUSTIFIED_ABSENCE") };
  return { profileId: String(row.profile_id), rpName, rank: 0, recommendation };
}

function snapshotConfig(value: unknown, fallback: { settings: BonusSettings; tiers: BonusTier[] }) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  try {
    const settings = validateBonusSettings(record.settings);
    const tiers = validateBonusTiers(record.tiers);
    return { settings, tiers };
  } catch {
    return fallback;
  }
}

export async function simulateWeek(input: { weekStart?: unknown }, now = new Date()): Promise<BonusSimulation> {
  const actor = await admin();
  const weekStart = monday(input.weekStart);
  const zone = timeZone();
  const range = weekRange(new Date(`${weekStart}T12:00:00Z`), zone);
  const weekEnd = nextDate(weekStart, 6);
  const client = createSupabaseAdminClient();
  const [profilesResult, shiftsResult, deliveriesResult, finesResult, absencesResult, config, runResult] = await Promise.all([
    client.from("profiles").select("id, rp_name, role, active").in("role", [...operationalStaffRoles]).eq("active", true),
    client.from("ems_shifts").select("profile_id, started_at, ended_at").lt("started_at", range.end.toISOString()).or(`ended_at.is.null,ended_at.gt.${range.start.toISOString()}`),
    client.from("deliveries").select("delivered_by, occurred_at").gte("occurred_at", range.start.toISOString()).lt("occurred_at", range.end.toISOString()),
    client.from("disciplinary_actions").select("profile_id, fine_amount").eq("type", "fine").eq("applies_to_week", weekStart).is("voided_at", null),
    client.from("justified_absences").select("profile_id, starts_on, ends_on").lte("starts_on", weekEnd).gte("ends_on", weekStart).is("voided_at", null),
    loadSettings(client),
    client.from("bonus_runs").select("id, status, config_snapshot").eq("week_start", weekStart).maybeSingle(),
  ]);
  if (profilesResult.error || shiftsResult.error || deliveriesResult.error || finesResult.error || absencesResult.error || runResult.error) error("No se pudo cargar la simulación semanal");
  const source: BonusAggregationSource = { profiles: (profilesResult.data ?? []) as BonusAggregationSource["profiles"], shifts: (shiftsResult.data ?? []) as BonusAggregationSource["shifts"], deliveries: (deliveriesResult.data ?? []) as BonusAggregationSource["deliveries"], fines: (finesResult.data ?? []) as BonusAggregationSource["fines"], absences: (absencesResult.data ?? []) as BonusAggregationSource["absences"] };
  const run = runResult.data;
  if (run?.status === "finalized") {
    const resultsResult = await client.from("bonus_results").select("*").eq("run_id", run.id).order("total_score", { ascending: false });
    if (resultsResult.error) error("No se pudo cargar la simulación finalizada");
    const names = new Map(source.profiles.map((profile) => [profile.id, profile.rp_name]));
    const results = (resultsResult.data ?? []).map((row) => resultFromRow(row as Record<string, unknown>, names.get(String(row.profile_id)) ?? "EMS"));
    const ranked = results.map((result, index) => ({ ...result, rank: index + 1 }));
    const frozen = snapshotConfig(run.config_snapshot, config);
    return response(ranked, run.id, weekStart, weekEnd, "finalized", range.start <= now && now < range.end, frozen.settings, frozen.tiers);
  }
  const metrics = aggregateWeeklyMetricsDomain(source, config.settings, weekStart, zone, now);
  const calculated = metrics.map((row) => ({ profileId: row.profileId, rpName: row.rpName, recommendation: calculateBonus(row.metrics, config.settings, config.tiers) }));
  const ranked = rankRecommendations(calculated).map((entry) => ({ ...entry }));
  const snapshot = freezeConfig(config.settings, config.tiers);
  let runId = run?.id ? String(run.id) : null;
  if (!runId) { const inserted = await client.from("bonus_runs").insert({ week_start: weekStart, status: "draft", config_snapshot: snapshot, created_by: actor.id }).select("id").single(); if (inserted.error || !inserted.data) error("No se pudo crear el borrador semanal"); const insertedData = inserted.data as { id: string }; runId = String(insertedData.id); } else { const updated = await client.from("bonus_runs").update({ config_snapshot: snapshot }).eq("id", runId).eq("status", "draft"); if (updated.error) error("No se pudo actualizar el borrador semanal"); }
  const rows = ranked.map((entry) => ({ run_id: runId, profile_id: entry.profileId, weekly_minutes: entry.recommendation.metrics.weeklyMinutes, peak_minutes: entry.recommendation.metrics.peakMinutes, normal_minutes: entry.recommendation.metrics.normalMinutes, kits: entry.recommendation.metrics.kits, active_days: entry.recommendation.metrics.activeDays, peak_score: entry.recommendation.components.peak, kits_score: entry.recommendation.components.kits, normal_score: entry.recommendation.components.normal, consistency_score: entry.recommendation.components.consistency, total_score: entry.recommendation.score, base_amount: entry.recommendation.baseAmount, fine_total: entry.recommendation.fineTotal, recommended_final_amount: entry.recommendation.recommendedFinal, review_required: entry.recommendation.reviewRequired, review_reason: null }));
  if (rows.length) { const saved = await client.from("bonus_results").upsert(rows, { onConflict: "run_id,profile_id" }); if (saved.error) error("No se pudo guardar el borrador semanal"); }
  return response(ranked, runId, weekStart, weekEnd, "draft", range.start <= now && now < range.end, config.settings, config.tiers);
}

function response(results: BonusSimulationResult[], runId: string | null, weekStart: string, weekEnd: string, status: "draft" | "finalized", currentWeek: boolean, settings: BonusSettings, tiers: BonusTier[]): BonusSimulation {
  const averageScore = results.length ? Math.round((results.reduce((sum, item) => sum + item.recommendation.score, 0) / results.length) * 100) / 100 : 0;
  return { runId, weekStart, weekEnd, status, currentWeek, settings, tiers, summary: { evaluated: results.length, averageScore, estimatedTotal: results.reduce((sum, item) => sum + item.recommendation.recommendedFinal, 0), reviewRequired: results.filter((item) => item.recommendation.reviewRequired).length }, top3: results.slice(0, 3), results };
}
