import { NextResponse } from "next/server";
import { listBonusRuns } from "@/server/bonus-runs";
import { staffErrorResponse } from "@/server/staff-control";

export async function GET() {
  try { return NextResponse.json(await listBonusRuns()); }
  catch (error) { const mapped = staffErrorResponse(error); return NextResponse.json(mapped.body, { status: mapped.status }); }
}
