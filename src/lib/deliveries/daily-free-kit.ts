export const DAILY_FREE_KIT_QUANTITY = "5x5";

export function getAppLocalDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Monterrey", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function getDailyFreeKitDecision(enabled: boolean, quantity: string, alreadyUsed: boolean) {
  if (!enabled) return { free: false, warning: null };
  if (quantity !== DAILY_FREE_KIT_QUANTITY) return { free: false, warning: "El kit gratuito diario corresponde a 5x5. Esta entrega se cobrará." };
  if (alreadyUsed) return { free: false, warning: "Este oficial ya recibió su kit gratuito de hoy. Esta entrega sí se cobra." };
  return { free: true, warning: null };
}
