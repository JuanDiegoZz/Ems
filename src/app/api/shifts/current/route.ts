import { NextResponse } from "next/server";
import { getCurrentShift } from "@/server/shifts";
export async function GET() { try { return NextResponse.json({ shift: await getCurrentShift() }); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); } }
