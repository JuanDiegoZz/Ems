"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { Profile } from "@/lib/auth/types";
import { LogoutButton } from "@/components/auth/logout-button";
import { DeliverySheet, MobileMoreSheet } from "@/components/app-shell/mobile-more-sheet";
import { mobilePrimaryItems, routeIsActive } from "@/lib/navigation/mobile";
import { GlobalSearch } from "@/components/people/global-search";
import { ShiftIndicator } from "@/components/shifts/shift-indicator";
import { Badge, Icon, type IconName } from "@/components/ui";

const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Inicio", icon: "home" }, { href: "/people", label: "Personas", icon: "users" }, { href: "/history", label: "Historial", icon: "history" }, { href: "/shifts", label: "Bitácora", icon: "clock" }, { href: "/profile", label: "Perfil", icon: "user" },
];
function active(href: string, pathname: string) { return routeIsActive(href, pathname); }

export function AppShell({ profile, children }: { profile: Profile; children: ReactNode }) {
  const pathname = usePathname();
  const [sheet, setSheet] = useState<"deliveries" | "more" | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); } }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, []);
  const nav = [...links, ...(profile.role === "admin" ? [{ href: "/admin/staff", label: "Personal EMS", icon: "shield" as IconName }, { href: "/admin/bonuses", label: "Bonos semanales", icon: "badge" as IconName }, { href: "/admin/ems-performance", label: "Rendimiento EMS", icon: "activity" as IconName }, { href: "/admin/settings", label: "Configuración", icon: "settings" as IconName }] : [])];
  const initials = profile.rp_name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <div className="app-frame"><aside className="sidebar"><Link className="brand" href="/" aria-label="Ir al inicio de EMS Hospital"><span className="brand-mark">+</span><span>EMS Hospital</span></Link><button className="desktop-search-trigger" type="button" onClick={() => setSearchOpen(true)}><Icon name="search" size={17} />Buscar persona <kbd>Ctrl K</kbd></button><ShiftIndicator /><nav aria-label="Navegación principal">{nav.map((link) => <a className={`nav-link ${active(link.href, pathname) ? "active" : ""}`} href={link.href} key={link.href}><Icon name={link.icon} size={18} />{link.label}</a>)}</nav><div className="sidebar-user"><div className="flex items-center gap-3"><span className="avatar">{initials}</span><div className="min-w-0"><p className="truncate">{profile.rp_name}</p><div className="user-meta"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Activo <Badge tone="info">{profile.role === "admin" ? "Admin" : "EMS"}</Badge></div></div></div><div className="mt-4"><LogoutButton /></div></div></aside><div className="app-content"><header className="mobile-header"><Link className="brand" href="/" aria-label="Ir al inicio de EMS Hospital"><span className="brand-mark">+</span><span>EMS Hospital</span></Link><div className="flex items-center gap-2"><ShiftIndicator mobile /><button className="mobile-search-trigger" type="button" aria-label="Buscar persona" onClick={() => setSearchOpen(true)}><Icon name="search" size={20} /></button><Badge tone="info">{profile.role === "admin" ? "Admin" : "EMS"}</Badge></div></header><main className="content-wrap">{children}</main><nav className="bottom-nav" aria-label="Navegación móvil">{mobilePrimaryItems.map((link) => link.href.startsWith("#") ? <button className={`mobile-nav-button ${sheet === link.href.slice(1) ? "active" : ""}`} type="button" aria-pressed={sheet === link.href.slice(1)} onClick={() => setSheet(link.href.slice(1) as "deliveries" | "more")} key={link.href}><Icon name={link.icon} size={21} /><span>{link.label}</span></button> : <Link className={active(link.href, pathname) ? "active" : ""} aria-current={active(link.href, pathname) ? "page" : undefined} href={link.href} key={link.href}><Icon name={link.icon} size={21} /><span>{link.label}</span></Link>)}</nav><DeliverySheet open={sheet === "deliveries"} onClose={() => setSheet(null)} /><MobileMoreSheet open={sheet === "more"} onClose={() => setSheet(null)} profile={profile} /><GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} /></div></div>;
}
