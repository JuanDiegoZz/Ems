import { isValidIdentityText, normalizeIdentityText } from "./candidates.ts";
import type { DniCandidate, ScoredDniCandidate } from "./types.ts";

export function scoreIdentityCandidate(candidate: DniCandidate): ScoredDniCandidate {
  const text = normalizeIdentityText(candidate.text);
  const confidence = Math.max(0, Math.min(100, candidate.confidence));
  const valid = isValidIdentityText(text);
  const length = [...text].filter((char) => /\p{L}/u.test(char)).length;
  const geometryScore = Math.max(0, Math.min(1, candidate.geometry));
  const geometryContribution = geometryScore * 55;
  const confidenceContribution = confidence * 0.28;
  const repetitionContribution = Math.min(15, candidate.repetitions * 5);
  const lengthBonus = length >= 3 ? 8 : 3;
  const invalidPenalty = valid ? 0 : -100;
  const score = valid ? Math.round(geometryContribution + confidenceContribution + repetitionContribution + lengthBonus) : invalidPenalty;
  const accepted = valid && geometryScore >= 0.8 && score >= 65;
  return { ...candidate, text, score, accepted, scoreDebug: { candidate: text, confidence, geometry: geometryScore, repetitions: candidate.repetitions, validText: valid, geometryContribution, confidenceContribution, repetitionContribution, lengthBonus, invalidPenalty, score, threshold: 65, accepted, rejectionReason: accepted ? undefined : !valid ? "texto inválido" : geometryScore < 0.8 ? "geometría insuficiente" : "score insuficiente" } };
}

export function chooseIdentityCandidate(candidates: DniCandidate[]) {
  const grouped = new Map<string, DniCandidate>();
  for (const candidate of candidates) {
    const key = normalizeIdentityText(candidate.text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const previous = grouped.get(key);
    grouped.set(key, previous ? { ...candidate, repetitions: previous.repetitions + candidate.repetitions, confidence: Math.max(previous.confidence, candidate.confidence), geometry: Math.max(previous.geometry, candidate.geometry) } : candidate);
  }
  return [...grouped.values()].map(scoreIdentityCandidate).sort((left, right) => right.score - left.score).find((candidate) => candidate.accepted);
}
