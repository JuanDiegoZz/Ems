"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearRecentPeople } from "@/lib/people/recent-people";
import { clearPeopleSessionCache } from "@/lib/people/session-cache";
import { useActiveShift } from "@/components/shifts/active-shift-provider";

export function LogoutButton() {
  const router = useRouter(); const { clearActiveShift } = useActiveShift(); const [busy, setBusy] = useState(false);
  async function logout() { setBusy(true); clearRecentPeople(); clearPeopleSessionCache(); clearActiveShift(); try { await fetch("/api/auth/logout", { method: "POST" }); } finally { router.replace("/login"); router.refresh(); } }
  return <button className="button button-ghost w-full" type="button" onClick={logout} disabled={busy}>{busy ? "Cerrando sesión…" : "Cerrar sesión"}</button>;
}
