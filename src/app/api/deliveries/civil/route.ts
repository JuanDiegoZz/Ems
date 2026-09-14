import { NextResponse } from "next/server";
import { createCivilDelivery } from "@/server/deliveries";
import { perfTimer } from "@/lib/perf";
export async function POST(request: Request) { const done = perfTimer("POST /api/deliveries/civil"); try { return NextResponse.json(await createCivilDelivery(await request.json()), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo registrar la entrega" }, { status: 400 }); } finally { done(); } }




