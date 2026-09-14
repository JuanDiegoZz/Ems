import type { PersonType } from "./validation.ts";

export type PasteTarget = "ine" | "badge";
export type PasteTargetResolution = PasteTarget | "ambiguous";

export function resolvePasteTarget(type: PersonType, hasIne: boolean, hasBadge: boolean, activeTarget: PasteTarget | null): PasteTargetResolution {
  if (type === "civil") return "ine";
  if (activeTarget) return activeTarget;
  if (!hasIne && hasBadge) return "ine";
  if (hasIne && !hasBadge) return "badge";
  return "ambiguous";
}
