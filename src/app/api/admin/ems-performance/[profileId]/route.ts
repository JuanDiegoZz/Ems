import { NextResponse } from "next/server";
import { getEmsPerformance } from "@/server/ems-performance";
export async function GET(request: Request, { params }: { params: Promise<{ profileId: string }> }) { try { const query = new URL(request.url).searchParams; return NextResponse.json(await getEmsPerformance((await params).profileId, Object.fromEntries(query.entries()))); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 403 }); } }
