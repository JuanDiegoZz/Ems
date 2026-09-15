"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchField } from "@/components/ui";
import { staffSearchParams, type StaffFilter } from "@/lib/staff-control/presentation";

const filters: Array<{ key: StaffFilter; label: string }> = [{ key: "all", label: "Todos" }, { key: "attention", label: "Atención" }, { key: "inactive", label: "Inactivos" }, { key: "goal", label: "Meta no cumplida" }, { key: "critical", label: "Críticos" }];
export function StaffFilters({ initialQuery, initialFilter }: { initialQuery: string; initialFilter: StaffFilter }) {
  const router = useRouter(); const params = useSearchParams(); const [query, setQuery] = useState(initialQuery);
  useEffect(() => { const timer = window.setTimeout(() => { if (query !== initialQuery) router.replace(`?${staffSearchParams(params, { q: query })}`); }, 350); return () => window.clearTimeout(timer); }, [query, initialQuery, params, router]);
  const setFilter = (filter: StaffFilter) => router.push(`?${staffSearchParams(params, { filter })}`);
  return <section className="staff-controls" aria-label="Buscar y filtrar personal"><SearchField placeholder="Buscar personal..." value={query} onChange={(event) => setQuery(event.target.value)} /><div className="filter-chips staff-filter-chips" role="list" aria-label="Filtros de personal">{filters.map((filter) => <button aria-current={initialFilter === filter.key ? "true" : undefined} className={`filter-chip ${initialFilter === filter.key ? "active" : ""}`} key={filter.key} type="button" onClick={() => setFilter(filter.key)}>{filter.label}</button>)}</div></section>;
}
