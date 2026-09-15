"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useActiveShift } from "@/components/shifts/active-shift-provider";
import { SHIFT_INDICATOR_HREF, shiftIndicatorLabel } from "@/lib/shifts/active-shift-state";

export function ShiftIndicator({ mobile = false }: { mobile?: boolean }) {
  const { activeShift, loading } = useActiveShift();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!activeShift) return; const update = () => setNow(Date.now()); const interval = window.setInterval(update, 60_000); window.addEventListener("focus", update); document.addEventListener("visibilitychange", update); return () => { window.clearInterval(interval); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); }; }, [activeShift]);
  if (loading || !activeShift) return null;
  const label = shiftIndicatorLabel(activeShift, mobile ? "mobile" : "desktop", new Date(now));
  const started = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Monterrey", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(activeShift.started_at));
  return <Link className={`shift-indicator ${mobile ? "shift-indicator-mobile" : ""}`} href={SHIFT_INDICATOR_HREF} aria-label={`Bitácora abierta. En servicio desde las ${started}. Tiempo trabajado ${label?.replace("En servicio · ", "") ?? ""}.`}><span aria-hidden="true">●</span><span className="shift-indicator-desktop-label">{label}</span><span className="shift-indicator-mobile-label">{shiftIndicatorLabel(activeShift, "mobile", new Date(now))}</span></Link>;
}
