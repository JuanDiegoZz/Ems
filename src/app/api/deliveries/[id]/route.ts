import { NextResponse } from "next/server";
import { updateDeliveryQuantity } from "@/server/deliveries";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { await updateDeliveryQuantity((await context.params).id, String((await request.json()).quantityLabel ?? "")); return NextResponse.json({ ok: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar" }, { status: 400 }); } }




