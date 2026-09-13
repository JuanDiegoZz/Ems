import { NextResponse } from "next/server";

import { resetManagedUserPassword } from "@/server/users";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.id !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    await resetManagedUserPassword(body.id, body.password);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "No se pudo restablecer la contraseña" }, { status: 400 });
  }
}




