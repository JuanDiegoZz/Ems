import assert from "node:assert/strict";
import test from "node:test";
import { canHardDelete } from "../../src/lib/people/delete-policy.ts";
import { buildDisplayName } from "../../src/lib/people/display-name.ts";

test("only admins can hard-delete people", () => {
  assert.equal(canHardDelete("admin"), true);
  assert.equal(canHardDelete("ems"), false);
});

test("automatic display name joins edited first and last names", () => {
  assert.equal(buildDisplayName("  Carlitos ", " Perez "), "Carlitos Perez");
});
