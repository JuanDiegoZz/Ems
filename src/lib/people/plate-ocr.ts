export function normalizeBadgeOcrText(value: string): string {
  const candidates = value
    .replace(/[Oo]/g, "0")
    .match(/\d{2,8}/g) ?? [];
  return candidates.sort((a, b) => b.length - a.length)[0] ?? "";
}

export function parseBadgeNumber(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  const direct = normalizeBadgeOcrText(normalized);
  if (direct) return direct;
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 2 && digits.length <= 8 ? digits : "";
}
