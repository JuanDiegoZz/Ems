import { startOfDayInTimeZone } from "../time/date.ts";

export type AnalyticsRangeKey = "today" | "7d" | "30d" | "month" | "all" | "custom";
export type AnalyticsRange = { start: Date | null; end: Date; label: string };

export function shiftDurationMilliseconds(startedAt: string | Date, endedAt: string | Date, now = new Date()) { return Math.max(0, new Date(endedAt ?? now).getTime() - new Date(startedAt).getTime()); }
export function overlapMilliseconds(startedAt: string | Date, endedAt: string | Date | null, rangeStart: Date, rangeEnd: Date, now = new Date()) { return Math.max(0, Math.min(new Date(endedAt ?? now).getTime(), rangeEnd.getTime()) - Math.max(new Date(startedAt).getTime(), rangeStart.getTime())); }
export function formatDuration(milliseconds: number) { const minutes = Math.floor(Math.max(0, milliseconds) / 60000); return `${String(Math.floor(minutes / 60)).padStart(2, "0")}h ${String(minutes % 60).padStart(2, "0")}m`; }

export function getAnalyticsRange(key: AnalyticsRangeKey, input: { from?: string; to?: string }, now = new Date()): AnalyticsRange {
  if (key === "all") return { start: null, end: now, label: "Todo el tiempo" };
  if (key === "7d") return { start: new Date(now.getTime() - 7 * 86400000), end: now, label: "Últimos 7 días" };
  if (key === "30d") return { start: new Date(now.getTime() - 30 * 86400000), end: now, label: "Últimos 30 días" };
  if (key === "month") { const day = startOfDayInTimeZone(now); const local = new Intl.DateTimeFormat("en-US", { timeZone: process.env.APP_TIMEZONE || "America/Monterrey", year: "numeric", month: "2-digit" }).formatToParts(now); const year = Number(local.find((part) => part.type === "year")?.value); const month = Number(local.find((part) => part.type === "month")?.value); const monthStart = new Date(day); monthStart.setUTCDate(1); monthStart.setUTCFullYear(year, month - 1); return { start: monthStart, end: now, label: "Este mes" }; }
  if (key === "custom" && input.from && input.to) { const start = new Date(`${input.from}T00:00:00`); const end = new Date(`${input.to}T23:59:59.999`); if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end) return { start, end, label: `${input.from} → ${input.to}` }; }
  return { start: startOfDayInTimeZone(now), end: now, label: "Hoy" };
}
