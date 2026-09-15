import assert from "node:assert/strict";
import test from "node:test";
import { loadDashboardStats } from "../../src/lib/dashboard/stats-state.ts";

test("delivery statistics stay pending without blocking the independent Dashboard stream", async () => {
  let resolve!: (value: number) => void;
  let settled = false;
  const stats = loadDashboardStats(() => new Promise<number>((done) => { resolve = done; })).then((result) => { settled = true; return result; });
  await Promise.resolve();
  assert.equal(settled, false);
  resolve(3);
  assert.deepEqual(await stats, { state: "ready", value: 3 });
});

test("a delivery statistics failure becomes an isolated unavailable state", async () => {
  const result = await loadDashboardStats(async () => { throw new Error("database unavailable"); });
  assert.deepEqual(result, { state: "unavailable" });
});
