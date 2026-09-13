import { NextResponse } from "next/server";
import { createManagedUser, listManagedUsers } from "@/server/users";
export async function GET() { try { return NextResponse.json({ items: await listManagedUsers() }); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 403 }); } }
export async function POST(request: Request) { const body = await request.json().catch(() => null); if (!body || typeof body.username !== "string" || typeof body.rpName !== "string" || typeof body.password !== "string") return NextResponse.json({ error: "Datos inválidos" }, { status: 400 }); try { return NextResponse.json({ user: await createManagedUser({ username: body.username, rpName: body.rpName, password: body.password, role: body.role === "admin" ? "admin" : "ems" }) }, { status: 201 }); } catch { return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 400 }); } }




