export type StaffFilter = "all" | "attention" | "inactive" | "goal" | "critical" | "missing-webhook";

export function summaryFilter(filter: StaffFilter) { return filter; }

export function staffSearchParams(current: URLSearchParams, update: Partial<{ q: string; filter: StaffFilter; page: number }>) {
  const next = new URLSearchParams(current);
  if (update.q !== undefined) { if (update.q) next.set("q", update.q); else next.delete("q"); }
  if (update.filter !== undefined) { if (update.filter === "all") next.delete("filter"); else next.set("filter", update.filter); }
  if ((update.q !== undefined || update.filter !== undefined) && update.page === undefined) next.delete("page");
  if (update.page !== undefined) { if (update.page <= 1) next.delete("page"); else next.set("page", String(update.page)); }
  return next;
}

export function fineLabel(amount: number) { return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(amount).replace("MXN", "").trim(); }

export function permissionLabel(date: string) { return `Permiso hasta ${new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replace(".", "").toLowerCase()}`; }

export function conversionNotice(preview: { willGenerateStrike: boolean; activeWarnsBefore: number; activeWarnsAfterOrConversion: number; warnsPerStrike: number }) {
  return preview.willGenerateStrike ? `Este será su warn ${preview.warnsPerStrike}. Al confirmar, los ${preview.warnsPerStrike} warns se convertirán en 1 strike.` : `Warns actuales: ${preview.activeWarnsBefore}/${preview.warnsPerStrike}. Después: ${preview.activeWarnsAfterOrConversion}/${preview.warnsPerStrike}.`;
}

export function generatedStrikeVoidNotice(remainingWarns: number) { void remainingWarns; return "Este strike fue generado por el warn que completó el límite. Al anularlo, el warn disparador también será anulado y los warnings anteriores volverán a estar activos."; }

export function emptyStaffState(query: string) { return query ? { title: "No encontramos personal", description: `No hay coincidencias para “${query}”.` } : { title: "No hay personal para este filtro", description: "Prueba otro filtro o registra actividad para el equipo." }; }
