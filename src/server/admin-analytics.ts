import "server-only";

import { operationalStaffRoles } from "../lib/auth/operational-staff.ts";
import { aggregateAdminAnalytics, getAdminAnalyticsRange, type AdminAnalytics, type AnalyticsPeriod, type AnalyticsSource } from "../lib/analytics/aggregation.ts";
import { requireAdmin } from "../lib/auth/session.ts";
import { createSupabaseAdminClient } from "../lib/supabase/admin.ts";

const periods: AnalyticsPeriod[] = ["week", "previous-week", "7d", "30d"];
const timeZone = () => process.env.APP_TIMEZONE && process.env.APP_TIMEZONE !== "undefined" ? process.env.APP_TIMEZONE : "America/Monterrey";

export function parseAnalyticsPeriod(value: unknown): AnalyticsPeriod { return typeof value === "string" && periods.includes(value as AnalyticsPeriod) ? value as AnalyticsPeriod : "week"; }

function relation(value: unknown): { display_name: string; badge_number: string | null; type: "civil" | "police" } | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const item = row as Record<string, unknown>;
  return typeof item.display_name === "string" && (item.type === "civil" || item.type === "police") ? { display_name: item.display_name, badge_number: typeof item.badge_number === "string" ? item.badge_number : null, type: item.type } : null;
}

function latestBonusResult(row: Record<string, unknown>) {
  return {
    profile_id: String(row.profile_id), total_score: Number(row.total_score ?? 0), final_amount: row.final_amount === null || row.final_amount === undefined ? null : Number(row.final_amount), recommended_final_amount: Number(row.recommended_final_amount ?? 0), fine_total: Number(row.fine_total ?? 0), override_amount: row.override_amount === null || row.override_amount === undefined ? null : Number(row.override_amount), peak_score: Number(row.peak_score ?? 0), kits_score: Number(row.kits_score ?? 0), normal_score: Number(row.normal_score ?? 0), consistency_score: Number(row.consistency_score ?? 0), weekly_minutes: Number(row.weekly_minutes ?? 0), peak_minutes: Number(row.peak_minutes ?? 0), normal_minutes: Number(row.normal_minutes ?? 0), kits: Number(row.kits ?? 0), active_days: Number(row.active_days ?? 0),
  };
}

export async function getAdminAnalytics(input: { period?: unknown } = {}): Promise<AdminAnalytics> {
  await requireAdmin();
  const period = parseAnalyticsPeriod(input.period);
  const now = new Date();
  const range = getAdminAnalyticsRange(period, now, timeZone());
  const client = createSupabaseAdminClient();
  const [profiles, shifts, deliveries, actions, absences, settings, bonusRun] = await Promise.all([
    client.from("profiles").select("id, username, rp_name, role, active, created_at").in("role", [...operationalStaffRoles]),
    client.from("ems_shifts").select("id, profile_id, started_at, ended_at").lt("started_at", now.toISOString()),
    client.from("deliveries").select("id, delivered_by, person_id, type, occurred_at, people(display_name, badge_number, type)").gte("occurred_at", range.previous.start.toISOString()).lt("occurred_at", range.end.toISOString()),
    client.from("disciplinary_actions").select("id, profile_id, type, fine_amount, issued_at, applies_to_week, voided_at").is("voided_at", null),
    client.from("justified_absences").select("id, profile_id, starts_on, ends_on, created_at, voided_at").is("voided_at", null),
    client.from("bonus_settings").select("active_day_minimum_minutes, peak_start, peak_end, weekly_goal_minutes, warns_per_strike, critical_strikes, inactivity_alert_days").eq("id", true).single(),
    client.from("bonus_runs").select("id, week_start").eq("status", "finalized").order("week_start", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (profiles.error || shifts.error || deliveries.error || actions.error || absences.error || settings.error || bonusRun.error || !settings.data) throw new Error("No se pudieron cargar las analíticas administrativas");

  const bonusResults = bonusRun.data ? await client.from("bonus_results").select("profile_id, total_score, final_amount, recommended_final_amount, fine_total, override_amount, peak_score, kits_score, normal_score, consistency_score, weekly_minutes, peak_minutes, normal_minutes, kits, active_days").eq("run_id", bonusRun.data.id) : { data: [], error: null };
  if (bonusResults.error) throw new Error("No se pudo cargar la última semana finalizada");
  const source: AnalyticsSource = {
    profiles: (profiles.data ?? []) as AnalyticsSource["profiles"],
    shifts: (shifts.data ?? []) as AnalyticsSource["shifts"],
    deliveries: (deliveries.data ?? []).map((row) => ({ ...row, person: relation(row.people) })) as AnalyticsSource["deliveries"],
    actions: (actions.data ?? []) as AnalyticsSource["actions"],
    absences: (absences.data ?? []) as AnalyticsSource["absences"],
    settings: settings.data as AnalyticsSource["settings"],
    latestFinalizedBonus: bonusRun.data ? { weekStart: String(bonusRun.data.week_start), results: (bonusResults.data ?? []).map((row) => latestBonusResult(row as Record<string, unknown>)) } : undefined,
  };
  return aggregateAdminAnalytics(source, period, now, timeZone());
}
