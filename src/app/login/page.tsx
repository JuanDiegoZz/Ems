"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useToast } from "@/components/feedback/toast-provider";
import { useConnectivity } from "@/components/feedback/connectivity-provider";
import { beginLogin, failLogin, navigateAfterLogin, prepareLogin, type LoginPhase } from "@/lib/auth/login-feedback";

export default function LoginPage() {
  const router = useRouter(); const toast = useToast(); const { online } = useConnectivity(); const [error, setError] = useState(""); const [phase, setPhase] = useState<LoginPhase>("idle"); const pending = phase !== "idle";
  async function login(formData: FormData) { if (phase !== "idle") return; if (!online) { const offline = "No se pudo conectar con el servidor. Intenta nuevamente."; setError(offline); toast.error(offline); return; } setPhase(beginLogin); setError(""); try { const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: formData.get("username"), password: formData.get("password") }) }); const data = await response.json().catch(() => null) as { error?: string } | null; if (!response.ok) { setError(data?.error ?? "No se pudo iniciar sesión."); setPhase(failLogin); return; } setPhase(prepareLogin); navigateAfterLogin(router); } catch { setError("No se pudo conectar con el servidor. Intenta nuevamente."); setPhase(failLogin); } }
  const message = phase === "submitting" ? "Iniciando sesión..." : phase === "preparing" ? "Preparando EMS Hospital..." : "Iniciar sesión";
  return <main className={`login-page ${phase === "preparing" ? "login-page-leaving" : ""}`}><div className="login-card glass-card p-7 sm:p-9"><div className="brand"><BrandLogo /><span>EMS Hospital</span></div><p className="eyebrow mt-10">Acceso privado</p><h1 className="mt-2 text-3xl font-bold">Bienvenido de nuevo</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Entra con las credenciales de tu cuenta EMS.</p><form action={login} className="mt-8 grid gap-5" aria-busy={pending}><label className="field"><span>Usuario</span><div className="search-field"><Icon name="user" size={17} /><input name="username" autoComplete="username" disabled={pending} required /></div></label><label className="field"><span>Contraseña</span><div className="search-field"><Icon name="shield" size={17} /><input name="password" autoComplete="current-password" disabled={pending} required type="password" /></div></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<p className="sr-only" aria-live="polite" aria-atomic="true">{pending ? message : ""}</p><button className="button button-primary w-full" disabled={pending} aria-busy={pending} type="submit">{pending ? <><span className="loading-spinner" aria-hidden="true" />{message}</> : message}</button></form></div></main>;
}
