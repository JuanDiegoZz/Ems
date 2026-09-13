import { normalizeUsername } from "../normalization/person.ts";

export function toInternalEmail(username: string, domain: string): string {
  const normalizedDomain = domain.trim().toLowerCase();

  if (!/^[a-z0-9.-]+$/.test(normalizedDomain)) {
    throw new Error("INTERNAL_AUTH_DOMAIN is invalid");
  }

  return `${normalizeUsername(username)}@${normalizedDomain}`;
}




