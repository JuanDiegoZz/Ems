import { NextResponse } from "next/server";
import { getStaffFile, staffErrorResponse } from "@/server/staff-control";
export async function GET(request: Request, context: { params: Promise<{ profileId: string }> }) { try { return NextResponse.json(await getStaffFile((await context.params).profileId, Object.fromEntries(new URL(request.url).searchParams.entries())), { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { const mapped = staffErrorResponse(error); return NextResponse.json(mapped.body, { status: mapped.status }); } }
