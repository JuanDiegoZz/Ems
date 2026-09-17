import { NextRequest, NextResponse } from "next/server";
import { getStaffBonusHistoryDetail } from "@/server/bonus-runs";
import { staffErrorResponse } from "@/server/staff-control";

export async function GET(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { const { profileId } = await params; return NextResponse.json(await getStaffBonusHistoryDetail(profileId, request.nextUrl.searchParams.get("page") ?? "1"), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { const mapped = staffErrorResponse(error); return NextResponse.json(mapped.body, { status: mapped.status }); }
}
