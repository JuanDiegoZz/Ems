import { formatDuration, shiftDurationMilliseconds } from "./time.ts";

export type ActiveShift = { id: string; started_at: string; ended_at: string | null };
export const SHIFT_INDICATOR_HREF = "/shifts";

export function hydrateActiveShift(shift: ActiveShift | null) { return shift; }
export function clearActiveShift() { return null; }
export function shouldStartActiveShiftHydration(pathname: string, hydrated: boolean) { return pathname !== "/login" && !hydrated; }
export function completeActiveShiftHydration(shift: ActiveShift | null) { return { activeShift: hydrateActiveShift(shift), loading: false }; }
export function failActiveShiftHydration() { return { activeShift: null, loading: false }; }
export function updateActiveShiftAfterMutation(current: ActiveShift | null, action: "open" | "close", succeeded: boolean, shift?: ActiveShift | null) {
  if (!succeeded) return current;
  return action === "open" ? shift ?? current : null;
}
export function shiftIndicatorLabel(shift: ActiveShift | null, variant: "desktop" | "mobile", now = new Date()) {
  if (!shift) return null;
  const duration = formatDuration(shiftDurationMilliseconds(shift.started_at, now));
  return variant === "desktop" ? `En servicio · ${duration}` : duration;
}
