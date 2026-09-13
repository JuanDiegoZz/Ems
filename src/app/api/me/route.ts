import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/auth/session";
export async function GET() { const profile = await getActiveProfile(); return profile ? NextResponse.json({ user: { id: profile.id, username: profile.username, rpName: profile.rp_name, role: profile.role } }) : NextResponse.json({ error: "No autorizado" }, { status: 401 }); }




