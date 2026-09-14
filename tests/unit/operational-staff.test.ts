import assert from "node:assert/strict";
import test from "node:test";
import { isOperationalStaff, operationalStaffRoles } from "../../src/lib/auth/operational-staff.ts";

test("EMS and admins are operational staff", () => {
  assert.equal(isOperationalStaff("ems"), true);
  assert.equal(isOperationalStaff("admin"), true);
  assert.deepEqual(operationalStaffRoles, ["ems", "admin"]);
});
