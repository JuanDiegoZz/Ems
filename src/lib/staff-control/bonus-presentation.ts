export function formatBonusMinutes(minutes: number) { return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`; }
export function formatBonusWeek(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
  const first = formatter.format(new Date(`${start}T12:00:00Z`)).replace(".", "").toLowerCase();
  const last = formatter.format(new Date(`${end}T12:00:00Z`)).replace(".", "").toLowerCase();
  const [firstDay, firstMonth] = first.split(" ");
  const [lastDay, lastMonth] = last.split(" ");
  return firstMonth === lastMonth ? `${firstDay}–${lastDay} ${lastMonth}` : `${first}–${last}`;
}
export function progressPercent(actual: number, target: number) { return target > 0 ? Math.min(100, Math.max(0, Math.round((actual / target) * 100))) : 0; }
