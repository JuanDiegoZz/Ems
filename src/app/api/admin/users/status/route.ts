import { NextResponse } from "next/server";

import { setManagedUserActive } from "@/server/users";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.id !== "string" || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    await setManagedUserActive(body.id, body.active);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el usuario" }, { status: 400 });
  }
}




