export type SearchPerson = { id: string; type: "civil" | "police" };
export function shouldSearch(query: string) { return query.trim().length >= 2; }
export function globalSearchActions(person: SearchPerson) { return [{ label: "Ver persona", href: `/people/${person.id}` }, { label: "Entrega civil", href: `/deliveries/civil?personId=${person.id}` }, ...(person.type === "police" ? [{ label: "Entrega policial", href: `/deliveries/police?personId=${person.id}` }] : [])]; }
