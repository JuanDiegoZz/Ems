import { NextResponse } from "next/server";
import { staffErrorResponse, voidAction } from "@/server/staff-control";
export async function POST(request: Request, context: { params: Promise<{ actionId: string }> }) { const body = await request.json().catch(() => null); try { return NextResponse.json(await voidAction((await context.params).actionId, body?.voidReason)); } catch (error) { const mapped = staffErrorResponse(error); return NextResponse.json(mapped.body, { status: mapped.status }); } }
