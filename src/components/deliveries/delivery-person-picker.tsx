"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PersonRecord } from "@/server/people";
import { Icon } from "@/components/ui";
import { getDeliverySelectionView, isDeliveryPersonSelected } from "@/lib/deliveries/delivery-selection";

type DeliveryPersonPickerProps = {
  query: string;
  searchPlaceholder: string;
  onQueryChange: (value: string) => void;
  searching: boolean;
  people: PersonRecord[];
  selected: PersonRecord | null;
  onSelect: (person: PersonRecord) => void;
  renderPersonMeta: (person: PersonRecord) => ReactNode;
  selectedDetails: ReactNode;
  selectedForm: ReactNode;
  emptyState: ReactNode;
};

export function DeliveryPersonPicker({ query, searchPlaceholder, onQueryChange, searching, people, selected, onSelect, renderPersonMeta, selectedDetails, selectedForm, emptyState }: DeliveryPersonPickerProps) {
  const [mobilePicking, setMobilePicking] = useState(!selected);
  const panelRef = useRef<HTMLElement>(null);
  const previousSelectedId = useRef(selected?.id ?? null);
  const view = getDeliverySelectionView(selected?.id ?? null, mobilePicking);

  useEffect(() => {
    if (selected && selected.id !== previousSelectedId.current && !mobilePicking) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    previousSelectedId.current = selected?.id ?? null;
  }, [mobilePicking, selected]);

  function choose(person: PersonRecord) {
    onSelect(person);
    setMobilePicking(false);
  }

  return <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] md:items-start">
    <section className={view === "selected" ? "hidden md:block" : "grid gap-3"} aria-label="Buscar persona">
      <div className="glass-card grid gap-2 p-4"><input className="field-input" placeholder={searchPlaceholder} value={query} onChange={(event) => onQueryChange(event.target.value)} />{searching && <p className="text-xs text-[var(--muted)]" aria-live="polite">Buscando…</p>}</div>
      <p className="glass-card p-4 text-sm text-[var(--muted)] md:hidden">Selecciona una persona para continuar.</p>
      {selected && mobilePicking && <button className="button button-ghost md:hidden" type="button" onClick={() => setMobilePicking(false)}>Conservar persona</button>}
      {people.length > 0 && <div className="grid gap-3">{people.map((person) => { const personSelected = isDeliveryPersonSelected(selected?.id ?? null, person.id); return <button className={`glass-card flex items-start justify-between gap-3 border p-4 text-left transition ${personSelected ? "border-blue-400 bg-blue-500/10 ring-2 ring-blue-500/70" : "border-transparent"}`} type="button" key={person.id} aria-pressed={personSelected} onClick={() => choose(person)}><div><p className="font-semibold">{person.display_name}</p><p className="text-sm text-[var(--muted)]">{renderPersonMeta(person)}</p></div>{personSelected && <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-300"><span className="grid h-6 w-6 place-items-center rounded-full bg-blue-500/20"><Icon name="check" size={15} /></span>Seleccionado</span>}</button>; })}</div>}
      {people.length === 0 && query && !searching && emptyState}
    </section>
    <aside ref={panelRef} className={`${view === "picker" ? "hidden md:block" : "grid"} gap-4 md:sticky md:top-4 md:self-start`} aria-label={selected ? "Persona seleccionada y confirmación" : "Selección de persona"}>
      {selected ? <div className="glass-card grid gap-4 p-6"><div><div className="flex items-center gap-2 text-sm font-semibold text-blue-300"><span className="grid h-7 w-7 place-items-center rounded-full bg-blue-500/20"><Icon name="check" size={16} /></span>Persona seleccionada</div><p className="mt-3 text-2xl font-bold">{selected.display_name}</p><p className="text-sm text-[var(--muted)]">{selected.type === "police" ? "Policía" : "Civil"}</p></div>{selectedDetails}<button className="button button-ghost md:hidden" type="button" onClick={() => setMobilePicking(true)}>Cambiar persona</button>{selectedForm}</div> : <div className="glass-card p-6 text-sm text-[var(--muted)]">Selecciona una persona para continuar.</div>}
    </aside>
  </div>;
}
