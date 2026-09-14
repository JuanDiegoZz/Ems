"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/auth/types";
import { mobileMoreItems } from "@/lib/navigation/mobile";
import { LogoutButton } from "@/components/auth/logout-button";
import { Icon } from "@/components/ui";

export function MobileMoreSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: Profile }) {
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [open, onClose]);
  if (!open) return null;
  const items = mobileMoreItems(profile.role); const standard = items.slice(0, 2); const admin = items.slice(2);
  const list = (itemsToRender: typeof items) => itemsToRender.map((item) => <Link className="mobile-sheet-link" href={item.href} key={item.href} onClick={onClose}><Icon name={item.icon} size={20} />{item.label}</Link>);
  return <div className="mobile-sheet-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="mobile-sheet" role="dialog" aria-modal="true" aria-labelledby="more-sheet-title"><div className="mobile-sheet-handle" /><div className="flex items-center justify-between gap-3"><h2 id="more-sheet-title" className="text-lg font-bold">Más</h2><button className="button button-ghost" type="button" onClick={onClose}>Cerrar</button></div><nav className="mt-4 grid gap-1" aria-label="Más opciones">{list(standard)}{admin.length > 0 && <><p className="mobile-sheet-section">Administración</p>{list(admin)}</>}</nav><div className="mt-4 border-t border-[var(--border)] pt-4"><LogoutButton /></div></section></div>;
}

export function DeliverySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [open, onClose]);
  if (!open) return null;
  return <div className="mobile-sheet-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="mobile-sheet" role="dialog" aria-modal="true" aria-labelledby="deliveries-sheet-title"><div className="mobile-sheet-handle" /><div className="flex items-center justify-between gap-3"><h2 id="deliveries-sheet-title" className="text-lg font-bold">Entregas</h2><button className="button button-ghost" type="button" onClick={onClose}>Cerrar</button></div><nav className="mt-4 grid gap-2"><Link className="mobile-sheet-link" href="/deliveries/civil" onClick={onClose}><Icon name="heart" size={20} />Entrega civil</Link><Link className="mobile-sheet-link" href="/deliveries/police" onClick={onClose}><Icon name="shield" size={20} />Entrega policial</Link></nav></section></div>;
}
