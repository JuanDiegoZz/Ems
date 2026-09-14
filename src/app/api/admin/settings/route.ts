import { NextResponse } from "next/server";
import { getDeliverySettings, updatePoliceDailyFreeKitEnabled } from "@/server/delivery-settings";

export async function GET() {
  try { return NextResponse.json(await getDeliverySettings()); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 403 }); }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.policeDailyFreeKitEnabled !== "boolean") return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try { return NextResponse.json(await updatePoliceDailyFreeKitEnabled(body.policeDailyFreeKitEnabled)); } catch { return NextResponse.json({ error: "No se pudo guardar la configuración" }, { status: 403 }); }
}
