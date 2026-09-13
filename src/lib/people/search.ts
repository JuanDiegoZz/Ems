import { normalizePersonName } from "../normalization/person.ts";

export type SearchablePerson = {
  first_name: string;
  last_name: string;
  display_name: string;
  badge_number: string | null;
};

function distance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

function fieldScore(value: string, query: string): number {
  const normalized = normalizePersonName(value);
  if (!normalized) return 0;
  if (normalized === query) return 1000;
  if (normalized.startsWith(query)) return 800;
  if (normalized.split(" ").some((token) => token.startsWith(query))) return 700;
  if (normalized.includes(query)) return 500;
  if (query.length < 3) return 0;
  const bestDistance = normalized.split(" ").reduce((best, token) => Math.min(best, distance(query, token)), query.length + 1);
  return bestDistance <= 2 ? 300 - bestDistance * 40 : 0;
}

export function scorePersonMatch(person: SearchablePerson, query: string): number {
  const normalizedQuery = normalizePersonName(query);
  if (!normalizedQuery) return 0;
  return Math.max(
    fieldScore(person.display_name, normalizedQuery),
    fieldScore(person.first_name, normalizedQuery),
    fieldScore(person.last_name, normalizedQuery),
    fieldScore(person.badge_number ?? "", normalizedQuery),
  );
}

export function rankPeople<T extends SearchablePerson>(people: readonly T[], query: string): T[] {
  const normalizedQuery = normalizePersonName(query);
  if (!normalizedQuery) return [...people];
  return people
    .map((person, index) => ({ person, index, score: scorePersonMatch(person, normalizedQuery) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.person);
}
