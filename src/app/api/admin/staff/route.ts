import { NextResponse } from "next/server";
import { listStaff, staffErrorResponse } from "@/server/staff-control";
export async function GET(request: Request) { try { return NextResponse.json(await listStaff(Object.fromEntries(new URL(request.url).searchParams.entries())), { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { const mapped = staffErrorResponse(error); return NextResponse.json(mapped.body, { status: mapped.status }); } }
