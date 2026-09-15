import assert from "node:assert/strict";
import test from "node:test";
import { formatBonusMinutes, formatBonusWeek, progressPercent } from "../../src/lib/staff-control/bonus-presentation.ts";

test("bonus presentation helpers format weeks, minutes and capped progress", () => {
  assert.equal(formatBonusMinutes(0), "0h 00m");
  assert.equal(formatBonusMinutes(762), "12h 42m");
  assert.equal(formatBonusWeek("2026-09-14", "2026-09-20"), "14–20 sep");
  assert.equal(progressPercent(5, 10), 50);
  assert.equal(progressPercent(20, 10), 100);
});
