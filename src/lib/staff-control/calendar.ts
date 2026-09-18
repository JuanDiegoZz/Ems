export const STAFF_TIME_ZONE = process.env.APP_TIMEZONE || "America/Monterrey";

export type LocalDateRange = { start: Date; end: Date };
export type ShiftInterval = { startedAt: Date | string; endedAt: Date | string | null };
export type PeakWindow = { start: string; end: string };
export type JustifiedAbsence = { startsOn: string; endsOn: string };

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function partsAt(value: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(value);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

function localDateTime(parts: LocalParts, timeZone: string): Date {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let guess = target;
  for (let index = 0; index < 4; index += 1) {
    const actual = partsAt(new Date(guess), timeZone);
    const delta = target - Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    if (delta === 0) break;
    guess += delta;
  }
  return new Date(guess);
}

function localDay(value: Date, timeZone: string): LocalParts { const parts = partsAt(value, timeZone); return { ...parts, hour: 0, minute: 0, second: 0 }; }
function addDays(parts: LocalParts, days: number): LocalParts { const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days)); return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: parts.hour, minute: parts.minute, second: parts.second }; }
function dayKey(parts: LocalParts) { return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`; }
function timeMinutes(value: string) { const match = /^(\d{2}):(\d{2})$/.exec(value); if (!match) throw new Error("Hora inválida"); const hour = Number(match[1]); const minute = Number(match[2]); if (hour > 23 || minute > 59) throw new Error("Hora inválida"); return hour * 60 + minute; }
function intervalMinutes(start: Date, end: Date) { return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)); }
function clipped(shift: ShiftInterval, range: LocalDateRange, now: Date) { const start = new Date(shift.startedAt); const end = new Date(shift.endedAt ?? now); return { start: new Date(Math.max(start.getTime(), range.start.getTime())), end: new Date(Math.min(end.getTime(), range.end.getTime())) }; }

export function weekRange(value = new Date(), timeZone = STAFF_TIME_ZONE): LocalDateRange {
  const day = localDay(value, timeZone);
  const weekday = new Date(Date.UTC(day.year, day.month - 1, day.day)).getUTCDay();
  const monday = addDays(day, -((weekday + 6) % 7));
  return { start: localDateTime(monday, timeZone), end: localDateTime(addDays(monday, 7), timeZone) };
}

export function localDateKey(value: Date | string, timeZone = STAFF_TIME_ZONE) { return dayKey(localDay(new Date(value), timeZone)); }
export function localDayRange(value: Date | string, timeZone = STAFF_TIME_ZONE): LocalDateRange { const day = localDay(new Date(value), timeZone); return { start: localDateTime(day, timeZone), end: localDateTime(addDays(day, 1), timeZone) }; }

export function splitShiftMinutes(shift: ShiftInterval, range: LocalDateRange, peak: PeakWindow, now = new Date(), timeZone = STAFF_TIME_ZONE) {
  const interval = clipped(shift, range, now);
  if (interval.end <= interval.start) return { peakMinutes: 0, normalMinutes: 0, totalMinutes: 0 };
  const peakStart = timeMinutes(peak.start);
  const peakEnd = timeMinutes(peak.end);
  let peakMinutes = 0;
  let cursor = localDateTime(localDay(interval.start, timeZone), timeZone);
  while (cursor < interval.end) {
    const nextDay = localDateTime(addDays(localDay(cursor, timeZone), 1), timeZone);
    const segmentStart = new Date(Math.max(cursor.getTime(), interval.start.getTime()));
    const segmentEnd = new Date(Math.min(nextDay.getTime(), interval.end.getTime()));
    const day = localDay(cursor, timeZone);
    const overlaps = (startMinute: number, endMinute: number) => intervalMinutes(new Date(Math.max(segmentStart.getTime(), localDateTime({ ...day, hour: Math.floor(startMinute / 60), minute: startMinute % 60, second: 0 }, timeZone).getTime())), new Date(Math.min(segmentEnd.getTime(), localDateTime({ ...day, hour: Math.floor(endMinute / 60), minute: endMinute % 60, second: 0 }, timeZone).getTime())));
    if (peakStart < peakEnd) peakMinutes += overlaps(peakStart, peakEnd);
    else peakMinutes += overlaps(0, peakEnd) + overlaps(peakStart, 1440);
    cursor = nextDay;
  }
  const totalMinutes = intervalMinutes(interval.start, interval.end);
  return { peakMinutes, normalMinutes: totalMinutes - peakMinutes, totalMinutes };
}

export function weeklyGoal(currentMinutes: number, targetMinutes = 300) {
  const met = currentMinutes >= targetMinutes;
  return { met, currentMinutes, targetMinutes, remainingMinutes: Math.max(0, targetMinutes - currentMinutes), label: met ? "Meta semanal cumplida" : "No cumplió meta semanal" };
}

export function activeDays(shifts: ShiftInterval[], range: LocalDateRange, minimumMinutes = 30, now = new Date(), timeZone = STAFF_TIME_ZONE) {
  const byDay = new Map<string, number>();
  for (const shift of shifts) {
    const interval = clipped(shift, range, now);
    for (let cursor = localDateTime(localDay(interval.start, timeZone), timeZone); cursor < interval.end;) {
      const nextDay = localDateTime(addDays(localDay(cursor, timeZone), 1), timeZone);
      const minutes = intervalMinutes(new Date(Math.max(cursor.getTime(), interval.start.getTime())), new Date(Math.min(nextDay.getTime(), interval.end.getTime())));
      if (minutes > 0) { const key = dayKey(localDay(cursor, timeZone)); byDay.set(key, (byDay.get(key) ?? 0) + minutes); }
      cursor = nextDay;
    }
  }
  return [...byDay.values()].filter((minutes) => minutes >= minimumMinutes).length;
}

export function inactiveCalendarDays(lastActivityAt: Date | string, now: Date | string, absences: JustifiedAbsence[] = [], timeZone = STAFF_TIME_ZONE) {
  const lastDay = localDay(new Date(lastActivityAt), timeZone);
  const today = localDay(new Date(now), timeZone);
  let inactive = 0;
  for (let day = addDays(lastDay, 1); Date.UTC(day.year, day.month - 1, day.day) <= Date.UTC(today.year, today.month - 1, today.day); day = addDays(day, 1)) {
    const key = dayKey(day);
    if (!absences.some((absence) => absence.startsOn <= key && absence.endsOn >= key)) inactive += 1;
  }
  return inactive;
}
