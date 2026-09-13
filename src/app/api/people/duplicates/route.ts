import { NextResponse } from "next/server";
import { findPersonDuplicates } from "@/server/people";
export async function POST(request: Request) { try { return NextResponse.json(await findPersonDuplicates(await request.json())); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo comprobar" }, { status: 400 }); } }




