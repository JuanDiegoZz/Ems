import { normalizePersonName } from "../normalization/person.ts";
import { operationalStaffRoles } from "../auth/operational-staff.ts";
import { activeDays, localDateKey, localDayRange, splitShiftMinutes, weekRange, type LocalDateRange } from "../staff-control/calendar.ts";
import { aggregateStaff, type StaffAggregationSource } from "../staff-control/aggregation.ts";

export type AnalyticsPeriod = "week" | "previous-week" | "7d" | "30d";
type Range = LocalDateRange & { label: string; previous: LocalDateRange & { label: string } };
type SourceProfile = { id: string; username: string; rp_name: string; role: "admin" | "ems"; active: boolean; created_at: string };
type SourceShift = { id: string; profile_id: string; started_at: string; ended_at: string | null };
type SourceDelivery = { id: string; delivered_by: string; person_id: string; type: "civil" | "police"; occurred_at: string; person: { display_name: string; badge_number: string | null; type: "civil" | "police" } | null };
type SourceAction = { id: string; profile_id: string; type: "warn" | "strike" | "fine"; fine_amount: number | null; issued_at: string; applies_to_week: string | null; voided_at: string | null };
type SourceAbsence = { id: string; profile_id: string; starts_on: string; ends_on: string; created_at: string; voided_at: string | null };
type SourceBonusResult = { profile_id: string; total_score: number; final_amount: number | null; recommended_final_amount: number; fine_total: number; override_amount: number | null; peak_score: number; kits_score: number; normal_score: number; consistency_score: number; weekly_minutes: number; peak_minutes: number; normal_minutes: number; kits: number; active_days: number };

export type AnalyticsSource = {
  profiles: SourceProfile[];
  shifts: SourceShift[];
  deliveries: SourceDelivery[];
  actions: SourceAction[];
  absences: SourceAbsence[];
  settings: { active_day_minimum_minutes: number; peak_start: string; peak_end: string; weekly_goal_minutes: number; warns_per_strike: number; critical_strikes: number; inactivity_alert_days: number };
  latestFinalizedBonus?: { weekStart: string; results: SourceBonusResult[] };
};

export type RecipientSummary = { name: string; count: number; badgeNumber: string | null; percentage: number };
export type DailyAnalytics = { date: string; label: string; workedMinutes: number; peakMinutes: number; normalMinutes: number; activeProfiles: number; shifts: number; deliveries: number; civilDeliveries: number; policeDeliveries: number };
export type BonusSummary = { label: "Última semana finalizada"; weekStart: string; totalAmount: number; averageScore: number; overrides: number; fineTotal: number; top3: Array<{ profileId: string; name: string; score: number; amount: number }>; };
export type IndividualBonus = BonusSummary & { score: number; amount: number; fineTotal: number; metrics: { weeklyMinutes: number; peakMinutes: number; normalMinutes: number; kits: number; activeDays: number }; components: { peak: number; kits: number; normal: number; consistency: number } };

export type AnalyticsProfile = {
  profileId: string; rpName: string;
  daily: DailyAnalytics[]; totalMinutes: number; peakMinutes: number; normalMinutes: number; shifts: number; deliveries: number; civilDeliveries: number; policeDeliveries: number; activeDays: number;
  recipients: { citizens: RecipientSummary[]; police: RecipientSummary[] };
  discipline: { warns: number; strikes: number; fines: number; fineTotal: number; permissions: number };
  status: { key: string; label: string; reason: string; reasons: string[]; attentionPriority: number };
  openShift: { startedAt: string; durationMinutes: number } | null;
  lastActivityAt: string | null; inactivityDays: number; inactivityLabel: string;
  bonus: IndividualBonus | null;
};

export type AdminAnalytics = {
  period: { key: AnalyticsPeriod; label: string; start: string; end: string; previousStart: string; previousEnd: string; timeZone: string };
  kpis: { workedMinutes: number; peakMinutes: number; shifts: number; deliveries: number; activityProfiles: number; activeProfiles: number; attention: number };
  comparison: { workedMinutes: ReturnType<typeof percentChange>; peakMinutes: ReturnType<typeof percentChange>; shifts: ReturnType<typeof percentChange>; deliveries: ReturnType<typeof percentChange>; activityProfiles: ReturnType<typeof percentChange> };
  daily: DailyAnalytics[];
  ranking: AnalyticsProfile[];
  peakNormal: { peakMinutes: number; normalMinutes: number; byProfile: Array<{ profileId: string; name: string; peakMinutes: number; normalMinutes: number }> };
  deliveries: { daily: DailyAnalytics[]; byType: { civil: number; police: number; total: number; civilPercentage: number; policePercentage: number }; insight: string; };
  recipients: { citizens: RecipientSummary[]; police: RecipientSummary[] };
  currentTeam: Array<{ profileId: string; name: string; durationMinutes: number }>;
  lastActivity: Array<{ profileId: string; name: string; lastActivityAt: string | null; inactivityDays: number; inactivityLabel: string }>;
  attention: Array<{ profileId: string; name: string; status: string; reason: string; href: string }>;
  discipline: { warns: number; strikes: number; fines: number; fineTotal: number; permissions: number };
  bonus: BonusSummary | null;
  profiles: AnalyticsProfile[];
};

const zoneDefault = () => process.env.APP_TIMEZONE && process.env.APP_TIMEZONE !== "undefined" ? process.env.APP_TIMEZONE : "America/Monterrey";
const rangeFrom = (start: Date, end: Date, label: string, previousStart: Date, previousEnd: Date, previousLabel: string): Range => ({ start, end, label, previous: { start: previousStart, end: previousEnd, label: previousLabel } });

export function getAdminAnalyticsRange(period: AnalyticsPeriod, now = new Date(), timeZone = zoneDefault()): Range {
  if (period === "week" || period === "previous-week") {
    const current = weekRange(period === "week" ? now : new Date(now.getTime() - 7 * 86400000), timeZone);
    const previous = weekRange(new Date(current.start.getTime() - 7 * 86400000), timeZone);
    return rangeFrom(current.start, current.end, period === "week" ? "Esta semana" : "Semana anterior", previous.start, previous.end, "Semana previa");
  }
  const duration = period === "30d" ? 30 * 86400000 : 7 * 86400000;
  const start = new Date(now.getTime() - duration);
  const previousStart = new Date(start.getTime() - duration);
  return rangeFrom(start, now, period === "30d" ? "Últimos 30 días" : "Últimos 7 días", previousStart, start, "Periodo anterior");
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? { value: 0, label: "Sin cambio" } : { value: null, label: "Nuevo" };
  const value = Math.round(((current - previous) / previous) * 100);
  return { value, label: `${value >= 0 ? "+" : ""}${value}%` };
}

function inRange(value: string, range: LocalDateRange) { const time = new Date(value).getTime(); return time >= range.start.getTime() && time < range.end.getTime(); }
function overlap(shift: SourceShift, range: LocalDateRange, now: Date) { return Math.max(0, Math.min(new Date(shift.ended_at ?? now).getTime(), range.end.getTime()) - Math.max(new Date(shift.started_at).getTime(), range.start.getTime())); }
function dayList(range: LocalDateRange, timeZone: string) {
  const result: Array<{ key: string; range: LocalDateRange }> = [];
  for (let cursor = range.start; cursor < range.end;) { const day = localDayRange(cursor, timeZone); const start = new Date(Math.max(day.start.getTime(), range.start.getTime())); const end = new Date(Math.min(day.end.getTime(), range.end.getTime())); result.push({ key: localDateKey(cursor, timeZone), range: { start, end } }); cursor = day.end; }
  return result;
}
function recipientRows(deliveries: SourceDelivery[], type: "civil" | "police"): RecipientSummary[] {
  const rows = new Map<string, { name: string; badgeNumber: string | null; count: number; id: string }>();
  for (const delivery of deliveries) { if (delivery.type !== type || !delivery.person) continue; const key = delivery.person_id; const current = rows.get(key) ?? { name: delivery.person.display_name, badgeNumber: delivery.person.badge_number, count: 0, id: key }; current.count += 1; rows.set(key, current); }
  const total = deliveries.filter((delivery) => delivery.type === type).length;
  return [...rows.values()].sort((a, b) => b.count - a.count || normalizePersonName(a.name).localeCompare(normalizePersonName(b.name)) || a.id.localeCompare(b.id)).slice(0, 5).map((row) => ({ name: row.name, count: row.count, badgeNumber: row.badgeNumber, percentage: total ? Math.round((row.count / total) * 100) : 0 }));
}
function dailyForProfile(profileId: string, shifts: SourceShift[], deliveries: SourceDelivery[], range: LocalDateRange, now: Date, peak: { start: string; end: string }, timeZone: string): DailyAnalytics[] {
  return dayList(range, timeZone).map(({ key, range: day }) => {
    const ownShifts = shifts.filter((shift) => shift.profile_id === profileId);
    const split = ownShifts.map((shift) => splitShiftMinutes({ startedAt: shift.started_at, endedAt: shift.ended_at }, day, peak, now, timeZone));
    const dailyDeliveries = deliveries.filter((delivery) => delivery.delivered_by === profileId && inRange(delivery.occurred_at, day));
    return { date: key, label: new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone }).format(day.start), workedMinutes: split.reduce((sum, item) => sum + item.totalMinutes, 0), peakMinutes: split.reduce((sum, item) => sum + item.peakMinutes, 0), normalMinutes: split.reduce((sum, item) => sum + item.normalMinutes, 0), activeProfiles: 0, shifts: ownShifts.filter((shift) => overlap(shift, day, now) > 0).length, deliveries: dailyDeliveries.length, civilDeliveries: dailyDeliveries.filter((delivery) => delivery.type === "civil").length, policeDeliveries: dailyDeliveries.filter((delivery) => delivery.type === "police").length };
  });
}
function disciplineFor(profileId: string, actions: SourceAction[], absences: SourceAbsence[], range: LocalDateRange) {
  const ownActions = actions.filter((action) => action.profile_id === profileId && inRange(action.issued_at, range));
  const ownAbsences = absences.filter((absence) => absence.profile_id === profileId && inRange(absence.created_at, range));
  return { warns: ownActions.filter((action) => action.type === "warn").length, strikes: ownActions.filter((action) => action.type === "strike").length, fines: ownActions.filter((action) => action.type === "fine" && action.voided_at === null).length, fineTotal: ownActions.filter((action) => action.type === "fine" && action.voided_at === null).reduce((sum, action) => sum + (action.fine_amount ?? 0), 0), permissions: ownAbsences.filter((absence) => absence.voided_at === null).length };
}
function bonusFor(profileId: string, bonus: AnalyticsSource["latestFinalizedBonus"], names: Map<string, string>): IndividualBonus | null {
  const result = bonus?.results.find((item) => item.profile_id === profileId); if (!result || !bonus) return null;
  const amount = result.final_amount ?? result.recommended_final_amount;
  return { label: "Última semana finalizada", weekStart: bonus.weekStart, totalAmount: amount, averageScore: result.total_score, overrides: result.override_amount === null ? 0 : 1, fineTotal: result.fine_total, top3: [{ profileId, name: names.get(profileId) ?? "EMS", score: result.total_score, amount }], score: result.total_score, amount, metrics: { weeklyMinutes: result.weekly_minutes, peakMinutes: result.peak_minutes, normalMinutes: result.normal_minutes, kits: result.kits, activeDays: result.active_days }, components: { peak: result.peak_score, kits: result.kits_score, normal: result.normal_score, consistency: result.consistency_score } };
}
function teamBonus(source: AnalyticsSource, names: Map<string, string>): BonusSummary | null {
  if (!source.latestFinalizedBonus?.results.length) return null;
  const results = source.latestFinalizedBonus.results.map((result) => ({ profileId: result.profile_id, name: names.get(result.profile_id) ?? "EMS", score: result.total_score, amount: result.final_amount ?? result.recommended_final_amount, fineTotal: result.fine_total, override: result.override_amount !== null }));
  const ranked = [...results].sort((a, b) => b.score - a.score || normalizePersonName(a.name).localeCompare(normalizePersonName(b.name)) || a.profileId.localeCompare(b.profileId));
  return { label: "Última semana finalizada", weekStart: source.latestFinalizedBonus.weekStart, totalAmount: results.reduce((sum, result) => sum + result.amount, 0), averageScore: results.length ? Math.round((results.reduce((sum, result) => sum + result.score, 0) / results.length) * 10) / 10 : 0, overrides: results.filter((result) => result.override).length, fineTotal: results.reduce((sum, result) => sum + result.fineTotal, 0), top3: ranked.slice(0, 3).map(({ profileId, name, score, amount }) => ({ profileId, name, score, amount })) };
}

export function aggregateAdminAnalytics(source: AnalyticsSource, period: AnalyticsPeriod, now = new Date(), timeZone = zoneDefault()): AdminAnalytics {
  const range = getAdminAnalyticsRange(period, now, timeZone);
  const operationalProfiles = source.profiles.filter((profile) => operationalStaffRoles.includes(profile.role));
  const profiles = operationalProfiles.filter((profile) => profile.active);
  const names = new Map(operationalProfiles.map((profile) => [profile.id, profile.rp_name]));
  const staffSource: StaffAggregationSource = { profiles, shifts: source.shifts, deliveries: source.deliveries.map((delivery) => ({ delivered_by: delivery.delivered_by, occurred_at: delivery.occurred_at })), actions: source.actions.map((action) => ({ id: action.id, profile_id: action.profile_id, type: action.type, fine_amount: action.fine_amount, applies_to_week: action.applies_to_week, voided_at: action.voided_at })), absences: source.absences.map((absence) => ({ profile_id: absence.profile_id, starts_on: absence.starts_on, ends_on: absence.ends_on, voided_at: absence.voided_at })), settings: { weekly_goal_minutes: source.settings.weekly_goal_minutes, warns_per_strike: source.settings.warns_per_strike, critical_strikes: source.settings.critical_strikes, inactivity_alert_days: source.settings.inactivity_alert_days } };
  const staff = aggregateStaff(staffSource, { q: "", filter: "all", page: 1, pageSize: 100 }, now);
  const staffById = new Map(staff.items.map((item) => [item.profile.id, item]));
  const peak = { start: source.settings.peak_start.slice(0, 5), end: source.settings.peak_end.slice(0, 5) };
  const buildProfiles = (targetRange: LocalDateRange) => profiles.map((profile) => {
    const ownShifts = source.shifts.filter((shift) => shift.profile_id === profile.id);
    const ownDeliveries = source.deliveries.filter((delivery) => delivery.delivered_by === profile.id && inRange(delivery.occurred_at, targetRange));
    const split = ownShifts.map((shift) => splitShiftMinutes({ startedAt: shift.started_at, endedAt: shift.ended_at }, targetRange, peak, now, timeZone));
    const daily = dailyForProfile(profile.id, ownShifts, source.deliveries, targetRange, now, peak, timeZone);
    const staffItem = staffById.get(profile.id);
    const lastActivityAt = staffItem?.activity.lastActivityAt ?? null;
    const open = ownShifts.find((shift) => shift.ended_at === null && new Date(shift.started_at).getTime() <= now.getTime());
    const recipientsDeliveries = ownDeliveries;
    return { profileId: profile.id, rpName: profile.rp_name, daily, totalMinutes: split.reduce((sum, item) => sum + item.totalMinutes, 0), peakMinutes: split.reduce((sum, item) => sum + item.peakMinutes, 0), normalMinutes: split.reduce((sum, item) => sum + item.normalMinutes, 0), shifts: ownShifts.filter((shift) => overlap(shift, targetRange, now) > 0).length, deliveries: ownDeliveries.length, civilDeliveries: ownDeliveries.filter((delivery) => delivery.type === "civil").length, policeDeliveries: ownDeliveries.filter((delivery) => delivery.type === "police").length, activeDays: activeDays(ownShifts.map((shift) => ({ startedAt: shift.started_at, endedAt: shift.ended_at })), targetRange, source.settings.active_day_minimum_minutes, now, timeZone), recipients: { citizens: recipientRows(recipientsDeliveries, "civil"), police: recipientRows(recipientsDeliveries, "police") }, discipline: disciplineFor(profile.id, source.actions, source.absences, targetRange), status: { key: staffItem?.status.key ?? "normal", label: staffItem?.status.label ?? "Normal", reason: staffItem?.status.reasons[0]?.label ?? "Sin alertas", reasons: staffItem?.status.reasons.map((reason) => reason.label) ?? [], attentionPriority: staffItem?.status.attentionPriority ?? 7 }, openShift: open ? { startedAt: open.started_at, durationMinutes: Math.max(0, Math.floor((now.getTime() - new Date(open.started_at).getTime()) / 60000)) } : null, lastActivityAt, inactivityDays: staffItem?.activity.inactivityDays ?? 0, inactivityLabel: staffItem?.activity.inactivityLabel ?? "Sin actividad", bonus: bonusFor(profile.id, source.latestFinalizedBonus, names) } as AnalyticsProfile;
  });
  const currentProfiles = buildProfiles(range);
  const previousProfiles = buildProfiles(range.previous);
  const total = (key: "totalMinutes" | "peakMinutes" | "shifts" | "deliveries") => currentProfiles.reduce((sum, profile) => sum + profile[key], 0);
  const previousTotal = (key: "totalMinutes" | "peakMinutes" | "shifts" | "deliveries") => previousProfiles.reduce((sum, profile) => sum + profile[key], 0);
  const currentActivityProfiles = currentProfiles.filter((profile) => profile.totalMinutes > 0 || profile.deliveries > 0).length;
  const previousActivityProfiles = previousProfiles.filter((profile) => profile.totalMinutes > 0 || profile.deliveries > 0).length;
  const days = dayList(range, timeZone);
  const daily = days.map(({ key }) => { const rows = currentProfiles.map((profile) => profile.daily.find((item) => item.date === key)).filter((item): item is DailyAnalytics => Boolean(item)); return { date: key, label: rows[0]?.label ?? key, workedMinutes: rows.reduce((sum, item) => sum + item.workedMinutes, 0), peakMinutes: rows.reduce((sum, item) => sum + item.peakMinutes, 0), normalMinutes: rows.reduce((sum, item) => sum + item.normalMinutes, 0), activeProfiles: rows.filter((item) => item.workedMinutes > 0 || item.deliveries > 0).length, shifts: rows.reduce((sum, item) => sum + item.shifts, 0), deliveries: rows.reduce((sum, item) => sum + item.deliveries, 0), civilDeliveries: rows.reduce((sum, item) => sum + item.civilDeliveries, 0), policeDeliveries: rows.reduce((sum, item) => sum + item.policeDeliveries, 0) }; });
  const civil = currentProfiles.reduce((sum, profile) => sum + profile.civilDeliveries, 0);
  const police = currentProfiles.reduce((sum, profile) => sum + profile.policeDeliveries, 0);
  const deliveryTotal = civil + police;
  const insight = deliveryTotal === 0 ? "No hubo entregas durante este periodo." : civil >= police ? `Los ciudadanos representan el ${Math.round((civil / deliveryTotal) * 100)}% de las entregas del periodo.` : `Las entregas policiales superan a las civiles por ${police - civil} registros.`;
  const discipline = currentProfiles.reduce((sum, profile) => ({ warns: sum.warns + profile.discipline.warns, strikes: sum.strikes + profile.discipline.strikes, fines: sum.fines + profile.discipline.fines, fineTotal: sum.fineTotal + profile.discipline.fineTotal, permissions: sum.permissions + profile.discipline.permissions }), { warns: 0, strikes: 0, fines: 0, fineTotal: 0, permissions: 0 });
  const currentTeam = currentProfiles.filter((profile) => profile.openShift).sort((a, b) => (b.openShift?.durationMinutes ?? 0) - (a.openShift?.durationMinutes ?? 0)).map((profile) => ({ profileId: profile.profileId, name: profile.rpName, durationMinutes: profile.openShift?.durationMinutes ?? 0 }));
  const lastActivity = [...currentProfiles].sort((a, b) => b.inactivityDays - a.inactivityDays || normalizePersonName(a.rpName).localeCompare(normalizePersonName(b.rpName))).slice(0, 4).map((profile) => ({ profileId: profile.profileId, name: profile.rpName, lastActivityAt: profile.lastActivityAt, inactivityDays: profile.inactivityDays, inactivityLabel: profile.inactivityLabel }));
  const attention = staff.items.filter((item) => item.status.key !== "normal").slice(0, 4).map((item) => ({ profileId: item.profile.id, name: item.profile.rpName, status: item.status.label, reason: item.status.reasons[0]?.label ?? item.status.label, href: `/admin/staff/${item.profile.id}` }));
  const teamBonusValue = teamBonus(source, names);
  const rankings = currentProfiles;
  return { period: { key: period, label: range.label, start: range.start.toISOString(), end: range.end.toISOString(), previousStart: range.previous.start.toISOString(), previousEnd: range.previous.end.toISOString(), timeZone }, kpis: { workedMinutes: total("totalMinutes"), peakMinutes: total("peakMinutes"), shifts: total("shifts"), deliveries: total("deliveries"), activityProfiles: currentActivityProfiles, activeProfiles: profiles.length, attention: attention.length }, comparison: { workedMinutes: percentChange(total("totalMinutes"), previousTotal("totalMinutes")), peakMinutes: percentChange(total("peakMinutes"), previousTotal("peakMinutes")), shifts: percentChange(total("shifts"), previousTotal("shifts")), deliveries: percentChange(total("deliveries"), previousTotal("deliveries")), activityProfiles: percentChange(currentActivityProfiles, previousActivityProfiles) }, daily, ranking: rankings, peakNormal: { peakMinutes: total("peakMinutes"), normalMinutes: total("totalMinutes") - total("peakMinutes"), byProfile: currentProfiles.map((profile) => ({ profileId: profile.profileId, name: profile.rpName, peakMinutes: profile.peakMinutes, normalMinutes: profile.normalMinutes })) }, deliveries: { daily, byType: { civil, police, total: deliveryTotal, civilPercentage: deliveryTotal ? Math.round((civil / deliveryTotal) * 100) : 0, policePercentage: deliveryTotal ? Math.round((police / deliveryTotal) * 100) : 0 }, insight }, recipients: { citizens: recipientRows(source.deliveries.filter((delivery) => inRange(delivery.occurred_at, range)), "civil"), police: recipientRows(source.deliveries.filter((delivery) => inRange(delivery.occurred_at, range)), "police") }, currentTeam, lastActivity, attention, discipline, bonus: teamBonusValue, profiles: rankings };
}
