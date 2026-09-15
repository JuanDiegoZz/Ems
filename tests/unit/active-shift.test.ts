import assert from "node:assert/strict";
import test from "node:test";
import { clearActiveShift, completeActiveShiftHydration, failActiveShiftHydration, hydrateActiveShift, shouldStartActiveShiftHydration, SHIFT_INDICATOR_HREF, shiftIndicatorLabel, updateActiveShiftAfterMutation, type ActiveShift } from "../../src/lib/shifts/active-shift-state.ts";
import { isOperationalStaff } from "../../src/lib/auth/operational-staff.ts";

const shift: ActiveShift = { id: "shift", started_at: "2026-09-14T18:00:00.000Z", ended_at: null };

test("active shifts show desktop and compact mobile indicator labels", () => {
  const now = new Date("2026-09-14T20:14:00.000Z");
  assert.equal(shiftIndicatorLabel(shift, "desktop", now), "En servicio · 02h 14m");
  assert.equal(shiftIndicatorLabel(shift, "mobile", now), "02h 14m");
  assert.equal(shiftIndicatorLabel(null, "desktop", now), null);
  assert.equal(SHIFT_INDICATOR_HREF, "/shifts");
  assert.equal(isOperationalStaff("ems"), true);
  assert.equal(isOperationalStaff("admin"), true);
});

test("successful shift mutations update active state while failed mutations preserve it", () => {
  assert.equal(updateActiveShiftAfterMutation(null, "open", true, shift), shift);
  assert.equal(updateActiveShiftAfterMutation(shift, "close", true), null);
  assert.equal(updateActiveShiftAfterMutation(shift, "open", false, null), shift);
  assert.equal(updateActiveShiftAfterMutation(shift, "close", false, null), shift);
});

test("hydration restores an existing shift and logout only clears local state", () => {
  assert.equal(hydrateActiveShift(shift), shift);
  assert.equal(clearActiveShift(), null);
});

test("an aborted Strict Mode hydration can retry before it is marked complete", () => {
  assert.equal(shouldStartActiveShiftHydration("/", false), true);
  // The first development-only mount was cancelled, so hydration is still incomplete.
  assert.equal(shouldStartActiveShiftHydration("/", false), true);
  assert.equal(shouldStartActiveShiftHydration("/", true), false);
  assert.equal(shouldStartActiveShiftHydration("/login", false), false);
});

test("every completed hydration settles loading for shift, empty, and error responses", () => {
  assert.deepEqual(completeActiveShiftHydration(shift), { activeShift: shift, loading: false });
  assert.deepEqual(completeActiveShiftHydration(null), { activeShift: null, loading: false });
  assert.deepEqual(failActiveShiftHydration(), { activeShift: null, loading: false });
});
