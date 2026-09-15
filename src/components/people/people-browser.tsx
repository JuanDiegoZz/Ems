"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import type { PeoplePage, PersonRecord } from "@/server/people";
import { Icon } from "@/components/ui";
import { pageAfterCriteriaChange, PEOPLE_PAGE_SIZE } from "@/lib/people/pagination";
import { joinPeopleRequest, readPeopleFirstPage, writePeopleFirstPage } from "@/lib/people/session-cache";
import { shouldApplyPeopleResult } from "@/lib/people/browser-state";

export function PeopleBrowser({ profileId, initial, initialSearch = "", initialType = "" }: { profileId: string; initial: PeoplePage; initialSearch?: string; initialType?: "" | "civil" | "police" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [people, setPeople] = useState<PersonRecord[]>(() => readPeopleFirstPage<PeoplePage>({ profileId, page: initial.page, search: initialSearch, type: initialType })?.items ?? initial.items);
  const [q, setQ] = useState(initialSearch);
  const [type, setType] = useState(initialType);
  const [page, setPage] = useState(initial.page);
  const [total, setTotal] = useState(initial.total);
  const [totalPages, setTotalPages] = useState(initial.totalPages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const previousPage = useRef(initial.page);
  const initialFetch = useRef(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => { writePeopleFirstPage({ profileId, page: initial.page, search: initialSearch, type: initialType }, initial); }, [initial, initialSearch, initialType, profileId]);

  useEffect(() => {
    if (q.trim().length >= 2) return;
    const revalidate = () => { if (document.visibilityState === "visible") setRefresh((value) => value + 1); };
    const interval = window.setInterval(revalidate, 25000);
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", revalidate); document.removeEventListener("visibilitychange", revalidate); };
  }, [q]);

  useEffect(() => {
    if (initialFetch.current) { initialFetch.current = false; return; }
    const currentSequence = ++sequence.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ search: q, type, page: String(page), pageSize: String(PEOPLE_PAGE_SIZE) });
        const shared = joinPeopleRequest({ profileId, page, search: q, type }, async (signal) => {
          const response = await fetch(`/api/people?${params}`, { signal, cache: "no-store" });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "No se pudo buscar");
          return data;
        });
        controller.signal.addEventListener("abort", shared.cancel, { once: true });
        const data = await shared.promise;
        shared.cancel();
        if (!data || !Array.isArray(data.items)) throw new Error("Respuesta inválida del servidor");
        if (shouldApplyPeopleResult(currentSequence, sequence.current, controller.signal.aborted)) {
          writePeopleFirstPage({ profileId, page, search: q, type }, data as PeoplePage);
          setPeople(data.items as PersonRecord[]);
          setPage(data.page);
          setTotal(data.total);
          setTotalPages(data.totalPages);
        }
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        if (shouldApplyPeopleResult(currentSequence, sequence.current, controller.signal.aborted)) setError(caught instanceof Error ? caught.message : "No se pudo buscar");
      } finally {
        if (shouldApplyPeopleResult(currentSequence, sequence.current, controller.signal.aborted)) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [page, profileId, q, refresh, type]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    if (type) params.set("type", type);
    params.set("page", String(page));
    router.replace(`${pathname}?${params}`, { scroll: false });
  }, [page, pathname, q, router, type]);

  useEffect(() => {
    if (previousPage.current !== page) listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    previousPage.current = page;
  }, [page]);

  function changeSearch(value: string) {
    setQ(value);
    setPage((current) => pageAfterCriteriaChange(current, q, type, value, type));
  }

  function changeType(value: "" | "civil" | "police") {
    setType(value);
    setPage((current) => pageAfterCriteriaChange(current, q, type, q, value));
  }

  function changePage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
  }

  const from = total === 0 ? 0 : (page - 1) * PEOPLE_PAGE_SIZE + 1;
  const to = Math.min(page * PEOPLE_PAGE_SIZE, total);
  const emptyMessage = q ? `No encontramos coincidencias para '${q}'.` : "No se encontraron personas.";

  return <div className="space-y-6">
    <div className="glass-card grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
      <label className="search-field"><Icon name="search" size={17} /><input aria-label="Buscar personas" placeholder="Nombre, apellido o placa" value={q} onChange={(event) => changeSearch(event.target.value)} /></label>
      <select className="field-input" value={type} onChange={(event) => changeType(event.target.value as "" | "civil" | "police")}><option value="">Todos</option><option value="civil">Civil</option><option value="police">Policía</option></select>
      {loading && <p className="text-xs text-[var(--muted)]" aria-live="polite">Buscando…</p>}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div ref={listRef} className="grid scroll-mt-6 gap-3">
      {people.map((person) => <Link className="glass-card card-interactive block p-5" href={`/people/${person.id}`} key={person.id}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[var(--text)]">{person.display_name}</p><p className="text-sm text-[var(--muted)]">{person.type === "police" ? `Policía · Placa ${person.badge_number ?? "pendiente"}` : "Civil"}</p></div><span className="text-xs text-[var(--muted)]">Ver ficha</span></div></Link>)}
      {!loading && people.length === 0 && <div className="glass-card p-8 text-center text-sm text-[var(--muted)]">{emptyMessage}</div>}
    </div>
    <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--muted)]">{from}–{to} de {total} personas</p>
      <nav className="flex items-center justify-between gap-3" aria-label="Paginación de personas">
        <button className="button button-secondary" type="button" disabled={loading || page <= 1} onClick={() => changePage(page - 1)}>Anterior</button>
        <span className="whitespace-nowrap text-sm text-[var(--muted)]">Página {page} de {totalPages}</span>
        <button className="button button-secondary" type="button" disabled={loading || page >= totalPages} onClick={() => changePage(page + 1)}>Siguiente</button>
      </nav>
    </div>
  </div>;
}
