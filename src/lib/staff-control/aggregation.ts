import { normalizePersonName } from "../normalization/person.ts";
import { operationalStaffRoles } from "../auth/operational-staff.ts";
import { activeDays, inactiveCalendarDays, splitShiftMinutes, weekRange, weeklyGoal } from "./calendar.ts";
import { attentionPriority, inactivityLabel, staffStatus } from "./status.ts";

export const STAFF_PAGE_SIZE = 6;
export type StaffFilter = "all" | "attention" | "inactive" | "goal" | "critical" | "missing-webhook";
export type StaffListQuery = { q: string; filter: StaffFilter; page: number; pageSize: number };
export type StaffAggregationSource = {
  profiles: Array<{ id: string; username: string; rp_name: string; role: "admin" | "ems"; active: boolean; created_at: string; webhook_configured?: boolean }>;
  shifts: Array<{ profile_id: string; started_at: string; ended_at: string | null }>;
  deliveries: Array<{ delivered_by: string; occurred_at: string }>;
  actions: Array<{ id: string; profile_id: string; type: "warn" | "strike" | "fine"; fine_amount: number | null; applies_to_week: string | null; voided_at: string | null }>;
  absences: Array<{ profile_id: string; starts_on: string; ends_on: string; voided_at: string | null }>;
  settings: { weekly_goal_minutes: number; warns_per_strike: number; critical_strikes: number; inactivity_alert_days: number };
};

const fail = (message: string): never => { throw new Error(message); };
const staffTimeZone = () => process.env.APP_TIMEZONE && process.env.APP_TIMEZONE !== "undefined" ? process.env.APP_TIMEZONE : "America/Monterrey";
const localDate = (value: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: staffTimeZone(), year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export function parseStaffListQuery(input: Record<string, string | undefined>): StaffListQuery {
  const filter = input.filter ?? "all";
  if (!( ["all", "attention", "inactive", "goal", "critical", "missing-webhook"] as const).includes(filter as StaffFilter)) fail("Filtro inválido");
  const page = Number(input.page ?? "1");
  const pageSize = Number(input.pageSize ?? String(STAFF_PAGE_SIZE));
  if (!Number.isInteger(page) || page < 1) fail("Página inválida");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) fail("Tamaño de página inválido");
  return { q: (input.q ?? "").trim().slice(0, 80), filter: filter as StaffFilter, page, pageSize };
}

export function previewWarnAction(activeWarnsBefore: number, warnsPerStrike: number) {
  const willGenerateStrike = warnsPerStrike > 0 && activeWarnsBefore + 1 >= warnsPerStrike;
  return { activeWarnsBefore, activeWarnsAfterOrConversion: willGenerateStrike ? 0 : activeWarnsBefore + 1, warnsPerStrike, willGenerateStrike };
}

export function aggregateStaff(source: StaffAggregationSource, query: StaffListQuery, now = new Date()) {
  const range = weekRange(now);
  const weekStart = range.start.toISOString().slice(0, 10);
  const today = localDate(now);
  const all = source.profiles.filter((profile) => profile.active && operationalStaffRoles.includes(profile.role)).map((profile) => {
    const shifts = source.shifts.filter((shift) => shift.profile_id === profile.id);
    const split = shifts.map((shift) => splitShiftMinutes({ startedAt: shift.started_at, endedAt: shift.ended_at }, range, { start: "22:00", end: "04:00" }, now));
    const weeklyMinutes = split.reduce((sum, item) => sum + item.totalMinutes, 0);
    const peakMinutes = split.reduce((sum, item) => sum + item.peakMinutes, 0);
    const active = source.actions.filter((action) => action.profile_id === profile.id && action.voided_at === null);
    const activeWarns = active.filter((action) => action.type === "warn").length;
    const activeStrikes = active.filter((action) => action.type === "strike").length;
    const activeFineTotal = active.filter((action) => action.type === "fine" && action.applies_to_week === weekStart).reduce((sum, action) => sum + (action.fine_amount ?? 0), 0);
    const lastActivityAt = shifts.reduce<string | null>((latest, shift) => !latest || shift.started_at > latest ? shift.started_at : latest, null) ?? profile.created_at;
    const absences = source.absences.filter((absence) => absence.profile_id === profile.id && absence.voided_at === null);
    const inactivityDays = inactiveCalendarDays(lastActivityAt, now, absences.map((absence) => ({ startsOn: absence.starts_on, endsOn: absence.ends_on })));
    const goal = weeklyGoal(weeklyMinutes, source.settings.weekly_goal_minutes);
    const signal = { activeStrikes, activeWarns, inactivityDays, weeklyGoalMet: goal.met, warnsPerStrike: source.settings.warns_per_strike, criticalStrikes: source.settings.critical_strikes, inactivityThreshold: source.settings.inactivity_alert_days };
    const status = staffStatus(signal);
    const current = absences.filter((absence) => absence.starts_on <= today && absence.ends_on >= today);
    const permissionUntil = current.reduce<string | null>((end, absence) => !end || absence.ends_on > end ? absence.ends_on : end, null);
    return {
      profile: { id: profile.id, rpName: profile.rp_name, role: profile.role },
      status: { key: status.level, label: status.label, reviewLabel: status.reviewLabel, reasons: status.reasons, attentionPriority: attentionPriority(signal) },
      week: { weeklyMinutes, peakMinutes, activeDays: activeDays(shifts.map((shift) => ({ startedAt: shift.started_at, endedAt: shift.ended_at })), range, 30, now), goalMet: goal.met, targetMinutes: goal.targetMinutes },
      discipline: { activeWarns, activeStrikes, warnsPerStrike: signal.warnsPerStrike, criticalStrikes: signal.criticalStrikes, activeFineTotal },
      activity: { inactivityDays, inactivityLabel: inactivityLabel(inactivityDays), lastActivityAt },
      absence: { currentlyJustified: current.length > 0, permissionUntil },
      webhookConfigured: profile.webhook_configured === true,
    };
  });
  const summary = {
    active: all.filter((item) => item.status.key === "normal").length,
    attention: all.filter((item) => item.status.key !== "normal").length,
    critical: all.filter((item) => item.status.key === "critical").length,
    goalMissed: all.filter((item) => !item.week.goalMet).length,
    inactive: all.filter((item) => item.activity.inactivityDays >= source.settings.inactivity_alert_days).length,
    missingWebhook: all.filter((item) => !item.webhookConfigured).length,
  };
  const queryText = normalizePersonName(query.q);
  const usernames = new Map(source.profiles.map((profile) => [profile.id, profile.username]));
  const filtered = all.filter((item) => {
    const matchesSearch = !queryText || normalizePersonName(`${item.profile.rpName} ${usernames.get(item.profile.id) ?? ""}`).includes(queryText);
    const matchesFilter = query.filter === "all" || query.filter === "critical" && item.status.key === "critical" || query.filter === "attention" && item.status.key !== "normal" || query.filter === "inactive" && item.activity.inactivityDays >= source.settings.inactivity_alert_days || query.filter === "goal" && !item.week.goalMet || query.filter === "missing-webhook" && !item.webhookConfigured;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => a.status.attentionPriority - b.status.attentionPriority || normalizePersonName(a.profile.rpName).localeCompare(normalizePersonName(b.profile.rpName)) || a.profile.id.localeCompare(b.profile.id));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * query.pageSize;
  return { items: filtered.slice(start, start + query.pageSize), page, pageSize: query.pageSize, total, totalPages, summary, weekStart };
}
