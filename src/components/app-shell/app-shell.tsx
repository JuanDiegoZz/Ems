"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { Profile } from "@/lib/auth/types";
import { LogoutButton } from "@/components/auth/logout-button";
import { Badge, Icon, type IconName } from "@/components/ui";

const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/people", label: "Personas", icon: "users" },
  { href: "/history", label: "Historial", icon: "history" },
  { href: "/profile", label: "Perfil", icon: "user" },
];

function active(href: string, pathname: string) { return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`); }

export function AppShell({ profile, children }: { profile: Profile; children: ReactNode }) {
  const pathname = usePathname();
  const nav = [...links, ...(profile.role === "admin" ? [{ href: "/admin/users", label: "Personal EMS", icon: "shield" as IconName }, { href: "/admin/settings", label: "Entregas", icon: "settings" as IconName }] : [])];
  const initials = profile.rp_name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <div className="app-frame"><aside className="sidebar"><Link className="brand" href="/" aria-label="Ir al inicio de EMS Hospital"><span className="brand-mark">+</span><span>EMS Hospital</span></Link><nav aria-label="Navegación principal">{nav.map((link) => <a className={`nav-link ${active(link.href, pathname) ? "active" : ""}`} href={link.href} key={link.href}><Icon name={link.icon} size={18} />{link.label}</a>)}</nav><div className="sidebar-user"><div className="flex items-center gap-3"><span className="avatar">{initials}</span><div className="min-w-0"><p className="truncate">{profile.rp_name}</p><div className="user-meta"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Activo <Badge tone="info">{profile.role === "admin" ? "Admin" : "EMS"}</Badge></div></div></div><div className="mt-4"><LogoutButton /></div></div></aside><div className="app-content"><header className="mobile-header"><Link className="brand" href="/" aria-label="Ir al inicio de EMS Hospital"><span className="brand-mark">+</span><span>EMS Hospital</span></Link><Badge tone="info">{profile.role === "admin" ? "Admin" : "EMS"}</Badge></header><main className="content-wrap">{children}</main><nav className={`bottom-nav ${profile.role === "admin" ? "admin-nav" : ""}`} aria-label="Navegación móvil">{nav.map((link) => <a className={active(link.href, pathname) ? "active" : ""} href={link.href} key={link.href}><Icon name={link.icon} size={18} /><span>{link.label}</span></a>)}</nav></div></div>;
}

