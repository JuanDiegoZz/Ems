import { NextResponse } from "next/server";
import { listEmsPerformance } from "@/server/ems-performance";
export async function GET(request: Request) { try { const query = new URL(request.url).searchParams; return NextResponse.json(await listEmsPerformance(Object.fromEntries(query.entries()))); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 403 }); } }
