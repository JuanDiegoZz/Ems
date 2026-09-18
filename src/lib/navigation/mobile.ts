import type { AppRole } from "../auth/types.ts";
import type { IconName } from "../../components/ui/index.tsx";

export type MobileNavItem = { href: string; label: string; icon: IconName };
export const mobilePrimaryItems: readonly MobileNavItem[] = [
  { href: "/", label: "Inicio", icon: "home" }, { href: "/people", label: "Personas", icon: "users" }, { href: "#deliveries", label: "Entregas", icon: "package" }, { href: "/shifts", label: "Bitácora", icon: "clock" }, { href: "#more", label: "Más", icon: "more" },
];
export function mobileMoreItems(role: AppRole): MobileNavItem[] { return [{ href: "/history", label: "Historial", icon: "history" }, { href: "/profile", label: "Perfil", icon: "user" }, { href: "/prices", label: "Precios", icon: "badge" }, ...(role === "admin" ? [{ href: "/admin/staff", label: "Personal EMS", icon: "shield" as IconName }, { href: "/admin/analytics", label: "Analíticas", icon: "analytics" as IconName }, { href: "/admin/bonuses", label: "Bonos semanales", icon: "badge" as IconName }, { href: "/admin/ems-performance", label: "Rendimiento EMS", icon: "activity" as IconName }, { href: "/admin/settings", label: "Configuración", icon: "settings" as IconName }] : [])]; }
export function routeIsActive(href: string, pathname: string) { return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`); }
