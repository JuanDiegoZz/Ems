import { NextResponse } from "next/server";
import { PriceCatalogError, updatePrice } from "@/server/price-catalog";

function response(error: unknown) { if (error instanceof PriceCatalogError) return NextResponse.json({ error: error.message }, { status: error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : error.code === "VALIDATION_ERROR" ? 400 : error.code === "NOT_FOUND" ? 404 : 500 }); return NextResponse.json({ error: "No se pudo actualizar el precio." }, { status: 500 }); }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { const body = await request.json().catch(() => null); if (!body || typeof body !== "object") return NextResponse.json({ error: "Datos de precio inválidos." }, { status: 400 }); try { return NextResponse.json({ price: await updatePrice((await params).id, body as Record<string, unknown>) }, { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { return response(error); } }
