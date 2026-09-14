import { NextResponse } from "next/server";
import { closeShift, ShiftConflictError } from "@/server/shifts";
export async function POST() { try { return NextResponse.json(await closeShift()); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cerrar la bitácora" }, { status: error instanceof ShiftConflictError ? 409 : 400 }); } }
