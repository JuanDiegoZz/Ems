import { NextResponse } from "next/server";
import { getPoliceDailyKitStatus } from "@/server/delivery-settings";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const personId = new URL(request.url).searchParams.get("personId") ?? "";
  if (!UUID.test(personId)) return NextResponse.json({ error: "Persona inválida" }, { status: 400 });
  try { return NextResponse.json(await getPoliceDailyKitStatus(personId)); } catch { return NextResponse.json({ error: "No se pudo consultar el kit diario" }, { status: 400 }); }
}
