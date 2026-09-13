import { NextResponse } from "next/server";
import { toInternalEmail } from "@/lib/auth/identity";
import { getProfileById } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null); const domain = process.env.INTERNAL_AUTH_DOMAIN;
  if (!body || typeof body.username !== "string" || typeof body.password !== "string" || !domain) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 400 });
  try { const supabase = await createServerSupabaseClient(); const { data, error } = await supabase.auth.signInWithPassword({ email: toInternalEmail(body.username, domain), password: body.password }); if (error || !data.user) return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 }); const profile = await getProfileById(data.user.id); if (!profile?.active) { await supabase.auth.signOut(); return NextResponse.json({ error: "Esta cuenta está desactivada" }, { status: 403 }); } return NextResponse.json({ user: { id: profile.id, username: profile.username, rpName: profile.rp_name, role: profile.role } }); } catch { return NextResponse.json({ error: "No se pudo iniciar sesión" }, { status: 500 }); }
}




