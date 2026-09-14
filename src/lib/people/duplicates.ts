import { normalizePersonName } from "../normalization/person.ts";

export type DuplicateCandidate = { id: string; display_name: string; type: "civil" | "police"; badge_number: string | null };
export type DuplicateClassification = { kind: "exact" | "possible" | "none"; candidate?: DuplicateCandidate };

export type DuplicateLookup = Readonly<{
  type: "civil" | "police";
  firstName: string;
  lastName: string;
  displayName: string;
  badgeNumber: string;
  searchName: string;
}>;

export class DuplicateLookupValidationError extends Error {
  constructor(message = "La solicitud de duplicados no es válida.") {
    super(message);
    this.name = "DuplicateLookupValidationError";
  }
}

export function normalizeDuplicateLookupInput(input: unknown): DuplicateLookup {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new DuplicateLookupValidationError();
  const record = input as Record<string, unknown>;
  const rawType = record.type;
  if (rawType !== undefined && rawType !== "civil" && rawType !== "police") throw new DuplicateLookupValidationError();
  const type = rawType === "police" ? "police" : "civil";
  const firstName = normalizePersonName(record.firstName);
  const lastName = normalizePersonName(record.lastName);
  const displayName = normalizePersonName(record.displayName);
  const badgeNumber = typeof record.badgeNumber === "string" ? record.badgeNumber.trim() : "";
  const searchName = normalizePersonName([firstName, lastName, displayName].filter(Boolean).join(" "));
  return { type, firstName, lastName, displayName, badgeNumber, searchName };
}

export function canCheckDuplicates(firstName: string, lastName: string, displayName: string): boolean {
  return Boolean(firstName.trim() && lastName.trim() && displayName.trim());
}

export class DuplicateCheckHttpError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, payload: unknown) {
    super(duplicateCheckMessage(status, payload));
    this.status = status;
    this.payload = payload;
    this.name = "DuplicateCheckHttpError";
  }
}

export function duplicateCheckMessage(status: number, payload: unknown): string {
  const payloadMessage = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "";
  if (payloadMessage && payloadMessage.length <= 160 && !/typeerror|referenceerror|cannot read|normalize|undefined|stack| at /i.test(payloadMessage)) return payloadMessage;
  if (status === 400) return "La solicitud de duplicados no es válida.";
  if (status === 401 || status === 403) return "No tienes permisos para comprobar duplicados.";
  if (status >= 500) return "No se pudo comprobar duplicados en el servidor.";
  return `No se pudo comprobar duplicados (HTTP ${status}).`;
}

export function classifyDuplicate(input: { matches: readonly DuplicateCandidate[]; possibleMatches: readonly DuplicateCandidate[]; badgeMatches: readonly DuplicateCandidate[] }): DuplicateClassification {
  const candidate = input.badgeMatches[0] ?? input.matches[0];
  if (candidate) return { kind: "exact", candidate };
  if (input.possibleMatches[0]) return { kind: "possible", candidate: input.possibleMatches[0] };
  return { kind: "none" };
}
