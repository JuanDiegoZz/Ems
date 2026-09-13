import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { Badge, Card, PageHeader } from "@/components/ui";
import { LogoutButton } from "@/components/auth/logout-button";
import { getActiveProfile } from "@/lib/auth/session";

export default async function ProfilePage() { const profile = await getActiveProfile(); if (!profile) redirect("/login"); return <AppShell profile={profile}><PageHeader eyebrow="Perfil" title={profile.rp_name} description="Información de tu cuenta EMS." /><Card><div className="flex items-center gap-3"><span className="avatar">{profile.rp_name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><p className="font-semibold">{profile.rp_name}</p><p className="mt-1 text-sm text-[var(--muted)]">Cuenta activa</p></div></div><div className="mt-4 flex items-center gap-2"><Badge tone="success">Activo</Badge><Badge tone="info">{profile.role === "admin" ? "Administrador" : "EMS"}</Badge></div><div className="mt-5 max-w-xs"><LogoutButton /></div></Card></AppShell>; }






