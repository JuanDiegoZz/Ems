export function normalizeOcrProgress(progress: unknown) {
  if (typeof progress !== "number" || !Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, Math.round(progress * 100)));
}
