import type { ReviewReason } from "./bonus";

type Reviewable = { reviewRequired?: boolean; reviewResolved: boolean; recommendedFinal: number; finalAmount: number | null };
type DraftRun<T> = { status: "draft" | "finalized"; configSnapshot: unknown; results: T[] };

export function reviewReasonLabel(reason: ReviewReason) {
  return reason === "WEEKLY_GOAL_NOT_MET" ? "No cumplió la meta semanal" : "Ausencia justificada durante el periodo";
}

export function pendingReviewCount(results: readonly { recommendation: { reviewRequired: boolean; reviewResolved: boolean } }[]) {
  return results.filter((item) => item.recommendation.reviewRequired && !item.recommendation.reviewResolved).length;
}

export function canFinalize(results: readonly { recommendation: { reviewRequired: boolean; reviewResolved: boolean } }[]) {
  return pendingReviewCount(results) === 0;
}

export function adjustmentAmount(recommended: number, override: number | null) {
  return override === null ? 0 : override - recommended;
}

export function resolveReview<T extends Reviewable>(result: T, resolution: "approved" | "override", reason: string, amount?: number): Omit<T, "finalAmount" | "reviewResolved"> & { reviewResolved: true; reviewReason: string; finalAmount: number } {
  if (!reason.trim()) throw new Error("Motivo de revisión requerido");
  if (resolution === "override" && (!Number.isInteger(amount) || (amount as number) < 0)) throw new Error("El bono debe ser un entero mayor o igual a cero");
  return { ...result, reviewResolved: true, reviewReason: reason.trim(), finalAmount: resolution === "approved" ? result.recommendedFinal : amount as number };
}

export function overrideResult<T extends Reviewable>(result: T, amount: number, reason: string): Omit<T, "finalAmount" | "reviewResolved"> & { reviewResolved: true; reviewReason: string; finalAmount: number; overrideAmount: number; overrideReason: string } {
  return { ...resolveReview(result, "override", reason, amount), overrideAmount: amount, overrideReason: reason.trim() };
}

export function finalizeSnapshot<R extends { reviewRequired?: boolean; reviewResolved: boolean }>(run: DraftRun<R>) {
  if (run.status === "finalized") throw new Error("La semana ya está finalizada");
  if (run.results.some((result) => result.reviewRequired && !result.reviewResolved)) throw new Error("Hay revisiones pendientes");
  return { ...run, status: "finalized" as const, configSnapshot: structuredClone(run.configSnapshot), results: run.results.map((result) => structuredClone(result)) };
}

export function recalculate(run: { status: "draft" | "finalized" }) {
  if (run.status === "finalized") throw new Error("No se puede recalcular una semana finalizada");
  return run;
}
