import assert from "node:assert/strict";
import test from "node:test";
import { dashboardWarmupRoutes, shouldWarmDashboard, startDashboardWarmup } from "../../src/lib/dashboard/warmup.ts";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

test("warm-up skips save-data and slow connections", () => {
  assert.equal(shouldWarmDashboard({ saveData: true }), false);
  assert.equal(shouldWarmDashboard({ effectiveType: "2g" }), false);
  assert.equal(shouldWarmDashboard({ effectiveType: "3g" }), true);
  assert.deepEqual(dashboardWarmupRoutes("ems"), ["/people", "/history"]);
  assert.deepEqual(dashboardWarmupRoutes("admin"), ["/people", "/admin/settings", "/history"]);
});

test("warm-up starts only after the Dashboard mount handler runs and continues after an error", async () => {
  const calls = new Array<string>(); const scheduled: Array<() => void> = [];
  assert.equal(calls.length, 0);
  const stop = startDashboardWarmup({ routes: ["/people", "/history"], prefetch: (route: string) => { calls.push(route); if (route === "/people") throw new Error("offline"); }, schedule: (task: () => void) => { scheduled.push(task); return () => {}; } });
  await tick(); assert.deepEqual(calls, ["/people"]);
  scheduled.shift()?.(); await tick(); assert.deepEqual(calls, ["/people", "/history"]);
  stop();
});

test("Strict Mode cleanup does not duplicate an in-flight critical prefetch or leave the remount stuck", async () => {
  const calls = new Array<string>(); const scheduled: Array<() => void> = []; let resolve!: () => void;
  const prefetch = (route: string) => { calls.push(route); return new Promise<void>((done) => { resolve = done; }); };
  const first = startDashboardWarmup({ routes: ["/strict-first", "/strict-next"], prefetch, schedule: (task) => { scheduled.push(task); return () => {}; } });
  await tick(); first();
  const second = startDashboardWarmup({ routes: ["/strict-first", "/strict-next"], prefetch, schedule: (task) => { scheduled.push(task); return () => {}; } });
  await tick(); assert.deepEqual(calls, ["/strict-first"]);
  resolve(); await tick(); scheduled.shift()?.(); await tick(); assert.deepEqual(calls, ["/strict-first", "/strict-next"]);
  second();
});
