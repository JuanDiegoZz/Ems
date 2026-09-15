"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useActiveShift } from "@/components/shifts/active-shift-provider";
import { formatDuration, shiftDurationMilliseconds } from "@/lib/shifts/time";

export function DashboardShiftStatus() {
  const { activeShift, loading } = useActiveShift();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!activeShift) return; const update = () => setNow(Date.now()); const interval = window.setInterval(update, 60_000); window.addEventListener("focus", update); document.addEventListener("visibilitychange", update); return () => { window.clearInterval(interval); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); }; }, [activeShift]);
  if (loading) return <section className="glass-card" aria-label="Cargando bitácora"><div className="h-5 w-24 animate-pulse rounded bg-slate-700/60" /><div className="mt-4 h-8 w-40 animate-pulse rounded bg-slate-700/60" /></section>;
  if (!activeShift) return <section className="glass-card"><p className="eyebrow">Bitácora</p><h2 className="mt-2 text-xl font-bold">Bitácora cerrada</h2><p className="mt-2 text-sm text-[var(--muted)]">Aún no tienes un turno abierto.</p><Link className="button button-primary mt-5" href="/shifts">Abrir bitácora</Link></section>;
  return <section className="glass-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Bitácora</p><h2 className="mt-2 text-xl font-bold">En servicio</h2></div><span className="badge badge-success">● Activa</span></div><dl className="mt-5 grid grid-cols-2 gap-4"><div><dt className="text-sm text-[var(--muted)]">Tiempo</dt><dd className="mt-1 text-2xl font-bold">{formatDuration(shiftDurationMilliseconds(activeShift.started_at, new Date(now)))}</dd></div><div><dt className="text-sm text-[var(--muted)]">Inicio</dt><dd className="mt-1 font-semibold">{new Intl.DateTimeFormat("es-MX", { timeZone: "America/Monterrey", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(activeShift.started_at))}</dd></div></dl><Link className="button button-secondary mt-5" href="/shifts">Ver bitácora</Link></section>;
}
