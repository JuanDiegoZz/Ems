import { NextResponse } from "next/server";
import { createPoliceDelivery } from "@/server/deliveries";
export async function POST(request: Request) { try { return NextResponse.json(await createPoliceDelivery(await request.json()), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo registrar la entrega" }, { status: 400 }); } }




