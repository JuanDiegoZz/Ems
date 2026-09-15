import { normalizePersonName } from "../normalization/person.ts";
import { validateBonusSettings, validateBonusTiers, type BonusSettings, type BonusTier } from "./bonus-settings.ts";

export type { BonusSettings, BonusTier } from "./bonus-settings.ts";
export type BonusMetrics = {
  weeklyMinutes: number;
  peakMinutes: number;
  normalMinutes: number;
  kits: number;
  activeDays: number;
  activeFineTotal?: number;
  fines?: number;
  hasRelevantJustifiedAbsence?: boolean;
};
export type ReviewReason = "WEEKLY_GOAL_NOT_MET" | "JUSTIFIED_ABSENCE";
export type BonusComponents = { peak: number; kits: number; normal: number; consistency: number };
export type BonusRecommendation = {
  metrics: BonusMetrics;
  components: BonusComponents;
  score: number;
  displayScore: number;
  baseAmount: number;
  fineTotal: number;
  recommendedFinal: number;
  goalMet: boolean;
  reviewRequired: boolean;
  reviewReasons: ReviewReason[];
};
export type BonusRankingEntry = { profileId: string; rpName: string; recommendation: BonusRecommendation };
export type RankedBonusRecommendation = BonusRankingEntry & { rank: number };
export type BonusConfigSnapshot = { settings: BonusSettings; tiers: BonusTier[] };

const roundScore = (value: number) => Math.round(value * 1_000_000) / 1_000_000;
const metric = (value: number, target: number, weight: number) => roundScore(Math.min(value / target, 1) * weight);
const assertMetric = (value: number, key: string) => {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${key} debe ser un entero non-negative integer.`);
};

function validateMetrics(input: BonusMetrics) {
  assertMetric(input.weeklyMinutes, "weeklyMinutes");
  assertMetric(input.peakMinutes, "peakMinutes");
  assertMetric(input.normalMinutes, "normalMinutes");
  assertMetric(input.kits, "kits");
  assertMetric(input.activeDays, "activeDays");
  const fineTotal = input.activeFineTotal ?? input.fines ?? 0;
  if (input.activeFineTotal !== undefined && input.fines !== undefined && input.activeFineTotal !== input.fines) throw new Error("activeFineTotal y fines deben coincidir.");
  assertMetric(fineTotal, "activeFineTotal");
  if (input.hasRelevantJustifiedAbsence !== undefined && typeof input.hasRelevantJustifiedAbsence !== "boolean") throw new Error("hasRelevantJustifiedAbsence debe ser booleano.");
  return fineTotal;
}

function tierFor(score: number, tiers: BonusTier[]) {
  return tiers.find((tier) => score >= tier.minScore) ?? tiers.at(-1)!;
}

export function calculateBonus(metrics: BonusMetrics, settings: BonusSettings, tiers: readonly BonusTier[]): BonusRecommendation {
  const fineTotal = validateMetrics(metrics);
  const validSettings = validateBonusSettings(settings);
  const validTiers = validateBonusTiers([...tiers]);
  const components: BonusComponents = {
    peak: metric(metrics.peakMinutes, validSettings.peakTargetMinutes, validSettings.peakWeight),
    kits: metric(metrics.kits, validSettings.kitsTarget, validSettings.kitsWeight),
    normal: metric(metrics.normalMinutes, validSettings.normalTargetMinutes, validSettings.normalWeight),
    consistency: metric(metrics.activeDays, validSettings.activeDaysTarget, validSettings.consistencyWeight),
  };
  const score = roundScore(components.peak + components.kits + components.normal + components.consistency);
  const baseAmount = tierFor(score, validTiers).amount;
  const reviewReasons: ReviewReason[] = [];
  if (metrics.weeklyMinutes < validSettings.weeklyGoalMinutes) reviewReasons.push("WEEKLY_GOAL_NOT_MET");
  if (metrics.hasRelevantJustifiedAbsence ?? false) reviewReasons.push("JUSTIFIED_ABSENCE");
  return {
    metrics: { ...metrics, activeFineTotal: fineTotal, hasRelevantJustifiedAbsence: metrics.hasRelevantJustifiedAbsence ?? false },
    components,
    score,
    displayScore: Math.round(score),
    baseAmount,
    fineTotal,
    recommendedFinal: Math.max(0, baseAmount - fineTotal),
    goalMet: metrics.weeklyMinutes >= validSettings.weeklyGoalMinutes,
    reviewRequired: reviewReasons.length > 0,
    reviewReasons,
  };
}

export function rankRecommendations(entries: readonly BonusRankingEntry[]): RankedBonusRecommendation[] {
  return entries.map((entry) => ({ ...entry, recommendation: { ...entry.recommendation, metrics: { ...entry.recommendation.metrics }, components: { ...entry.recommendation.components }, reviewReasons: [...entry.recommendation.reviewReasons] } })).sort((left, right) => right.recommendation.score - left.recommendation.score || right.recommendation.metrics.peakMinutes - left.recommendation.metrics.peakMinutes || normalizePersonName(left.rpName).localeCompare(normalizePersonName(right.rpName)) || left.profileId.localeCompare(right.profileId)).map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function freezeConfig(settings: BonusSettings, tiers: readonly BonusTier[]): BonusConfigSnapshot {
  const orderedTiers = [...tiers].sort((left, right) => left.position - right.position);
  return { settings: { ...validateBonusSettings(settings) }, tiers: validateBonusTiers(orderedTiers).map((tier) => ({ ...tier })) };
}

export function formatPesos(amount: number) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error("El monto debe ser un entero no negativo.");
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(amount).replace("MXN", "").trim();
}
