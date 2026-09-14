"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const filters = [{ key: "today", label: "Hoy" }, { key: "7d", label: "7 días" }, { key: "30d", label: "30 días" }, { key: "month", label: "Mes" }, { key: "all", label: "Todo" }, { key: "custom", label: "Personalizado" }];
export function EmsPerformanceFilters({ initialRange = "today", initialFrom, initialTo }: { initialRange?: string; initialFrom?: string; initialTo?: string }) {
  const router = useRouter(); const params = useSearchParams(); const [range, setRange] = useState(initialRange); const [from, setFrom] = useState(initialFrom ?? ""); const [to, setTo] = useState(initialTo ?? "");
  function apply(nextRange = range) { const next = new URLSearchParams(params); next.set("range", nextRange); if (nextRange === "custom" && from && to) { next.set("from", from); next.set("to", to); } else { next.delete("from"); next.delete("to"); } router.push(`?${next}`); }
  return <section className="glass-card mb-5 p-4"><p className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">Rango</p><div className="filter-chips" role="tablist" aria-label="Rango de rendimiento">{filters.map((filter) => <button type="button" className={`filter-chip ${range === filter.key ? "active" : ""}`} role="tab" aria-selected={range === filter.key} key={filter.key} onClick={() => { setRange(filter.key); if (filter.key !== "custom") apply(filter.key); }}>{filter.label}</button>)}</div>{range === "custom" && <div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="field">Desde<input className="field-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="field">Hasta<input className="field-input" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><button className="button button-primary self-end" type="button" onClick={() => apply("custom")} disabled={!from || !to}>Aplicar</button></div>}</section>;
}
