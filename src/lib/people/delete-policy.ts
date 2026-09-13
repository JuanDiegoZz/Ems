import type { AppRole } from "../auth/types.ts";

export function canHardDelete(role: AppRole): boolean {
  return role === "admin";
}
