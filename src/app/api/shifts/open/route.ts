import { NextResponse } from "next/server";
import { openShift, ShiftConflictError } from "@/server/shifts";
export async function POST() { try { return NextResponse.json(await openShift(), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo abrir la bitácora" }, { status: error instanceof ShiftConflictError ? 409 : 400 }); } }
