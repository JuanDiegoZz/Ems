"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { useToast } from "@/components/feedback/toast-provider";
import { useConnectivity } from "@/components/feedback/connectivity-provider";

export default function LoginPage() {
  const router = useRouter(); const toast = useToast(); const { online } = useConnectivity(); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function login(formData: FormData) { if (pending) return; if (!online) { const offline = "No hay conexión. Intenta nuevamente cuando recuperes internet."; setError(offline); toast.error(offline); return; } setPending(true); setError(""); try { const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: formData.get("username"), password: formData.get("password") }) }); const data = await response.json().catch(() => null) as { error?: string } | null; if (!response.ok) { setError(data?.error ?? "No se pudo iniciar sesión."); return; } toast.success("Sesión iniciada."); router.replace("/"); router.refresh(); } catch { setError("No se pudo conectar con el servidor. Intenta de nuevo."); } finally { setPending(false); } }
  return <main className="login-page"><div className="login-card glass-card p-7 sm:p-9"><div className="brand"><span className="brand-mark">+</span><span>EMS Hospital</span></div><p className="eyebrow mt-10">Acceso privado</p><h1 className="mt-2 text-3xl font-bold">Bienvenido de nuevo</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Entra con las credenciales de tu cuenta EMS.</p><form action={login} className="mt-8 grid gap-5"><label className="field"><span>Usuario</span><div className="search-field"><Icon name="user" size={17} /><input name="username" autoComplete="username" required /></div></label><label className="field"><span>Contraseña</span><div className="search-field"><Icon name="shield" size={17} /><input name="password" autoComplete="current-password" required type="password" /></div></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-primary w-full" disabled={pending} aria-busy={pending} type="submit">{pending ? "Entrando…" : "Iniciar sesión"}</button></form></div></main>;
}
