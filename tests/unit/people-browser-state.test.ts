import assert from "node:assert/strict";
import test from "node:test";
import { shouldApplyPeopleResult } from "../../src/lib/people/browser-state.ts";

test("a slower Car result cannot replace the newer Carlos result", () => {
  const car = 1;
  const carlos = 2;
  assert.equal(shouldApplyPeopleResult(carlos, carlos, false), true);
  assert.equal(shouldApplyPeopleResult(car, carlos, false), false);
  assert.equal(shouldApplyPeopleResult(car, carlos, true), false);
});
