import assert from "node:assert/strict";
import test from "node:test";
import { performanceExportColumns, performanceExportFilename, performanceExportRows, performanceExportSearchParams, type ExportReport } from "../../src/lib/ems-performance/export.ts";

const report: ExportReport = { range: { label: "range", start: "2026-09-01T00:00:00.000Z", end: "2026-09-14T23:59:59.999Z" }, items: [{ profile: { rp_name: "Ana", role: "admin" }, hoursMilliseconds: 3_600_000, deliveries: 3, civil: 1, police: 2, breakdown: { "10x10": 1, "5x5": 1, "7x7": 1 } }, { profile: { rp_name: "Luis", role: "ems" }, hoursMilliseconds: 0, deliveries: 1, civil: 1, police: 0, breakdown: { "7x7": 1 } }] };

test("performance export keeps only real quantity labels in stable columns", () => {
  assert.deepEqual(performanceExportColumns(report), ["EMS", "Rol", "Horas trabajadas", "Entregas totales", "Entregas civiles", "Entregas policiales", "5x5", "10x10", "7x7"]);
  assert.deepEqual(performanceExportRows(report)[1], ["Ana", "Admin", "01h 00m", 3, 1, 2, 1, 1, 1]);
  assert.deepEqual(performanceExportRows(report)[2], ["Luis", "EMS", "00h 00m", 1, 1, 0, 0, 0, 1]);
});

test("performance export filenames preserve the visible period", () => {
  assert.equal(performanceExportFilename({ range: "today" }), "rendimiento-ems-hoy.xlsx");
  assert.equal(performanceExportFilename({ range: "7d" }), "rendimiento-ems-7-dias.xlsx");
  assert.equal(performanceExportFilename({ range: "30d" }), "rendimiento-ems-30-dias.xlsx");
  assert.equal(performanceExportFilename({ range: "month" }), "rendimiento-ems-este-mes.xlsx");
  assert.equal(performanceExportFilename({ range: "custom", from: "2026-09-01", to: "2026-09-14" }), "rendimiento-ems-2026-09-01-a-2026-09-14.xlsx");
});

test("performance export keeps the UI filter query unchanged", () => {
  assert.equal(performanceExportSearchParams(new URLSearchParams("range=custom&from=2026-09-01&to=2026-09-14")), "range=custom&from=2026-09-01&to=2026-09-14");
});
