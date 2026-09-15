import { NextResponse } from "next/server";
import { getBonusSettings, updateBonusSettings } from "@/server/bonus-runs";
import { staffErrorResponse } from "@/server/staff-control";

export async function GET() {
  try { return NextResponse.json(await getBonusSettings(), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { const mapped = staffErrorResponse(error); return NextResponse.json(mapped.body, { status: mapped.status }); }
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  try { return NextResponse.json(await updateBonusSettings(body ?? {}), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { const mapped = staffErrorResponse(error); return NextResponse.json(mapped.body, { status: mapped.status }); }
}
