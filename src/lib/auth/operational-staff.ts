import type { AppRole } from "./types.ts";

export const operationalStaffRoles: readonly AppRole[] = ["ems", "admin"];
export function isOperationalStaff(role: AppRole) { return operationalStaffRoles.includes(role); }
