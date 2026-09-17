import { NextResponse } from "next/server";
import { resolveBonusReview } from "@/server/bonus-runs";
import { staffErrorResponse } from "@/server/staff-control";

export async function POST(request: Request, { params }: { params: Promise<{ weekStart: string }> }) {
  const body = await request.json().catch(() => null);
  try { return NextResponse.json(await resolveBonusReview({ weekStart: (await params).weekStart, profileId: body?.profileId, reason: body?.reason }), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { const mapped = staffErrorResponse(error); return NextResponse.json(mapped.body, { status: mapped.status }); }
}
