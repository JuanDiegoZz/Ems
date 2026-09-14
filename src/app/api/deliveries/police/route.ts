import { NextResponse } from "next/server";
import { createPoliceDelivery, DailyFreeKitConfirmationError } from "@/server/deliveries";
import { perfTimer } from "@/lib/perf";
export async function POST(request: Request) { const done = perfTimer("POST /api/deliveries/police"); try { return NextResponse.json(await createPoliceDelivery(await request.json()), { status: 201 }); } catch (error) { if (error instanceof DailyFreeKitConfirmationError) return NextResponse.json({ code: error.code, error: error.message }, { status: 409 }); return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo registrar la entrega" }, { status: 400 }); } finally { done(); } }




