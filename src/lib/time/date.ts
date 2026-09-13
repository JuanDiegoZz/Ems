const defaultTimeZone = () => process.env.APP_TIMEZONE || "America/Monterrey";
export function formatDate(value: string | Date, timeZone = defaultTimeZone()) { return new Intl.DateTimeFormat("es-MX", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)); }
export function formatTime(value: string | Date, timeZone = defaultTimeZone()) { return new Intl.DateTimeFormat("es-MX", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
export function formatDateTime(value: string | Date, timeZone = defaultTimeZone()) { return `${formatDate(value, timeZone)} ${formatTime(value, timeZone)}`; }

export function startOfDayInTimeZone(value = new Date(), timeZone = defaultTimeZone()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const guess = Date.UTC(get("year"), get("month") - 1, get("day"));
  const offsetParts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(guess));
  const offset = Date.UTC(Number(offsetParts.find((part) => part.type === "year")?.value), Number(offsetParts.find((part) => part.type === "month")?.value) - 1, Number(offsetParts.find((part) => part.type === "day")?.value), Number(offsetParts.find((part) => part.type === "hour")?.value), Number(offsetParts.find((part) => part.type === "minute")?.value), Number(offsetParts.find((part) => part.type === "second")?.value)) - guess;
  return new Date(guess - offset);
}




