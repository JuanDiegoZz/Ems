import { NextResponse } from "next/server";
import { setPersonArchived } from "@/server/people";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { await setPersonArchived((await context.params).id, Boolean((await request.json()).archived)); return NextResponse.json({ ok: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Forbidden" }, { status: 403 }); } }




