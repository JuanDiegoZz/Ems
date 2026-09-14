import { normalizePersonName } from "../normalization/person.ts";

export type PersonType = "civil" | "police";
export type PersonInput = Readonly<{
  type: PersonType;
  firstName: string;
  lastName: string;
  displayName: string;
  badgeNumber?: string;
  inePath?: string;
  badgePath?: string;
}>;

export function validateSelectedIne(type: PersonType, hasIne: boolean): string | null {
  return type === "civil" && !hasIne ? "La INE es obligatoria para civiles" : null;
}

export function canChangePersonType(current: PersonType, next: PersonType) {
  return current !== "police" || next === "police";
}

export function normalizePersonInput(input: PersonInput) {
  const firstName = input.firstName.trim().replace(/\s+/g, " ");
  const lastName = input.lastName.trim().replace(/\s+/g, " ");
  const displayName = input.displayName.trim().replace(/\s+/g, " ");
  const badgeNumber = input.badgeNumber?.trim() || null;
  const inePath = input.inePath?.trim() || "";
  const badgePath = input.badgePath?.trim() || null;
  if (!firstName || !lastName || !displayName) throw new Error("Nombre, apellido y nombre visible son obligatorios");
  if (input.type === "civil" && !inePath) throw new Error("La imagen de INE es obligatoria");
  if (input.type === "police" && !inePath && !badgeNumber && !badgePath) throw new Error("Registra al menos una INE, número de placa o imagen de placa");
  return { type: input.type, firstName, lastName, displayName, badgeNumber, inePath, badgePath, searchName: normalizePersonName(`${firstName} ${lastName} ${displayName}`) };
}

export function probableDuplicate(nameMatches: number, badgeMatch: boolean) {
  return badgeMatch || nameMatches > 0;
}




