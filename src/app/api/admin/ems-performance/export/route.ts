import "server-only";

import { NextResponse } from "next/server";
import { utils, write } from "xlsx";
import { performanceExportFilename, performanceExportRows } from "@/lib/ems-performance/export";
import { formatDateTime } from "@/lib/time/date";
import { listEmsPerformance } from "@/server/ems-performance";

export async function GET(request: Request) {
  try {
    const filters = Object.fromEntries(new URL(request.url).searchParams.entries());
    const report = await listEmsPerformance(filters);
    const rows = [["Reporte:", "Rendimiento EMS"], ["Periodo seleccionado:", report.range.label], ["Desde:", report.range.start ? formatDateTime(report.range.start) : "Todo el tiempo"], ["Hasta:", formatDateTime(report.range.end)], ["Zona horaria:", "America/Monterrey"], ["Generado:", formatDateTime(new Date())], [], ...performanceExportRows(report)];
    const sheet = utils.aoa_to_sheet(rows); const workbook = utils.book_new(); utils.book_append_sheet(workbook, sheet, "Rendimiento EMS");
    const body = write(workbook, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(body, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${performanceExportFilename(filters)}"` } });
  } catch (error) { return NextResponse.json({ error: "No se pudo exportar el rendimiento." }, { status: error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden") ? 403 : 500 }); }
}
