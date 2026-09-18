"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/auth/types";
import { routeIsActive } from "@/lib/navigation/mobile";
import { Icon, type IconName } from "@/components/ui";

type SidebarLink = { href: string; label: string; icon: IconName };

const links: SidebarLink[] = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/people", label: "Personas", icon: "users" },
  { href: "/history", label: "Historial", icon: "history" },
  { href: "/shifts", label: "Bitácora", icon: "clock" },
  { href: "/profile", label: "Perfil", icon: "user" },
  { href: "/prices", label: "Precios", icon: "tags" },
];

const adminLinks: SidebarLink[] = [
  { href: "/admin/staff", label: "Personal EMS", icon: "shield" },
  { href: "/admin/analytics", label: "Analíticas", icon: "analytics" },
  { href: "/admin/bonuses", label: "Bonos semanales", icon: "badgeDollarSign" },
  { href: "/admin/ems-performance", label: "Rendimiento EMS", icon: "activity" },
  { href: "/admin/settings", label: "Configuración", icon: "settings" },
];

export function AnimatedSidebarNav({ role }: { role: Profile["role"] }) {
  const pathname = usePathname();
  const navLinks = role === "admin" ? [...links, ...adminLinks] : links;
  const activeHref = navLinks.find((link) => routeIsActive(link.href, pathname))?.href ?? null;
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [markerTop, setMarkerTop] = useState(0);
  const [markerVisible, setMarkerVisible] = useState(false);

  useEffect(() => {
    const measure = () => {
      const nav = navRef.current;
      const link = activeHref ? linkRefs.current.get(activeHref) : undefined;
      if (!nav || !link) {
        setMarkerVisible(false);
        return;
      }
      setMarkerTop(link.offsetTop + (link.offsetHeight - 28) / 2);
      setMarkerVisible(true);
    };

    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (observer && navRef.current) observer.observe(navRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeHref, navLinks.length]);

  return <div className="sidebar-nav-shell">
    <span className={`sidebar-active-marker ${markerVisible ? "visible" : ""}`} style={{ transform: `translate3d(0, ${markerTop}px, 0)` }} aria-hidden="true" />
    <nav ref={navRef} aria-label="Navegación principal">
      {navLinks.map((link) => {
        const isActive = activeHref === link.href;
        return <a
          className={`nav-link ${isActive ? "active" : ""}`}
          href={link.href}
          key={link.href}
          ref={(node) => { if (node) linkRefs.current.set(link.href, node); else linkRefs.current.delete(link.href); }}
          aria-current={isActive ? "page" : undefined}
        >
          <Icon name={link.icon} size={18} />
          {link.label}
        </a>;
      })}
    </nav>
  </div>;
}
