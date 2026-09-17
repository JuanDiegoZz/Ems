import { NextResponse } from "next/server";
import { finalizeBonusRun } from "@/server/bonus-runs";
import { staffErrorResponse } from "@/server/staff-control";

export async function POST(_: Request, { params }: { params: Promise<{ weekStart: string }> }) {
  try { return NextResponse.json(await finalizeBonusRun({ weekStart: (await params).weekStart }), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { const mapped = staffErrorResponse(error); return NextResponse.json(mapped.body, { status: mapped.status }); }
}
