import { NextResponse } from "next/server";
import { getStaffSettings, staffErrorResponse, updateStaffSettings } from "@/server/staff-control";
export async function GET() { try { return NextResponse.json(await getStaffSettings(), { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { const mapped = staffErrorResponse(error); return NextResponse.json(mapped.body, { status: mapped.status }); } }
export async function PATCH(request: Request) { const body = await request.json().catch(() => null); try { return NextResponse.json(await updateStaffSettings(body ?? {})); } catch (error) { const mapped = staffErrorResponse(error); return NextResponse.json(mapped.body, { status: mapped.status }); } }
