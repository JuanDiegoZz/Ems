import { formatDuration } from "../shifts/time.ts";

export type ExportReport = { range: { label: string; start: string | null; end: string }; items: Array<{ profile: { rp_name: string; role: "admin" | "ems" }; hoursMilliseconds: number; deliveries: number; civil: number; police: number; breakdown: Record<string, number> }> };
const preferredLabels = ["5x5", "10x10", "20x20", "40x40"];

export function performanceExportColumns(report: ExportReport) { const labels = [...new Set(report.items.flatMap((item) => Object.keys(item.breakdown)))].sort((a, b) => (preferredLabels.indexOf(a) + 1 || 99) - (preferredLabels.indexOf(b) + 1 || 99) || a.localeCompare(b, "es")); return ["EMS", "Rol", "Horas trabajadas", "Entregas totales", "Entregas civiles", "Entregas policiales", ...labels]; }
export function performanceExportRows(report: ExportReport) { const columns = performanceExportColumns(report); return [columns, ...report.items.map((item) => [item.profile.rp_name, item.profile.role === "admin" ? "Admin" : "EMS", formatDuration(item.hoursMilliseconds), item.deliveries, item.civil, item.police, ...columns.slice(6).map((label) => item.breakdown[label] ?? 0)])]; }
export function performanceExportSearchParams(params: URLSearchParams) { return params.toString(); }
export function performanceExportFilename(filters: { range?: string; from?: string; to?: string }) { if (filters.range === "custom" && /^\d{4}-\d{2}-\d{2}$/.test(filters.from ?? "") && /^\d{4}-\d{2}-\d{2}$/.test(filters.to ?? "")) return `rendimiento-ems-${filters.from}-a-${filters.to}.xlsx`; const names: Record<string, string> = { today: "hoy", "7d": "7-dias", "30d": "30-dias", month: "este-mes", all: "todo-el-tiempo" }; return `rendimiento-ems-${names[filters.range ?? "today"] ?? "hoy"}.xlsx`; }
