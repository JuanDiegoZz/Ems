import { NextResponse } from "next/server";
import { simulateWeek } from "@/server/bonus-runs";
import { staffErrorResponse } from "@/server/staff-control";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  try { return NextResponse.json(await simulateWeek(body ?? {}), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { const mapped = staffErrorResponse(error); return NextResponse.json(mapped.body, { status: mapped.status }); }
}
