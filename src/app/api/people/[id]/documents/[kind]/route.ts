import { NextResponse } from "next/server";
import { getPerson } from "@/server/people";
import { signedPersonDocument } from "@/lib/supabase/documents";
export async function GET(_: Request, context: { params: Promise<{ id: string; kind: string }> }) { try { const { id, kind } = await context.params; const person = await getPerson(id); const path = kind === "badge" ? person.badge_path : kind === "ine" ? person.ine_path : null; if (!path) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 }); return NextResponse.json({ url: await signedPersonDocument(path) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No disponible" }, { status: 404 }); } }




