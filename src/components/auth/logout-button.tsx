"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function LogoutButton() { const router = useRouter(); const [busy, setBusy] = useState(false); async function logout() { setBusy(true); try { await fetch("/api/auth/logout", { method: "POST" }); } finally { router.replace("/login"); router.refresh(); } } return <button className="button button-ghost w-full" type="button" onClick={logout} disabled={busy}>{busy ? "Cerrando sesión…" : "Cerrar sesión"}</button>; }




