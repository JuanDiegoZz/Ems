export type DeliveryRoute = "/deliveries/civil" | "/deliveries/police";
export type DeliveryKind = "civil" | "police";

export function parseDeliveryReturnTo(value: unknown): DeliveryRoute | null {
  return value === "/deliveries/civil" || value === "/deliveries/police" ? value : null;
}

export function deliveryRouteForType(type: DeliveryKind): DeliveryRoute { return type === "police" ? "/deliveries/police" : "/deliveries/civil"; }

export function postPersonDestination(returnTo: DeliveryRoute | null, type: DeliveryKind, personId: string) {
  return returnTo ? `${deliveryRouteForType(type)}?personId=${encodeURIComponent(personId)}` : `/people/${personId}`;
}

export function deliveryActionsForPerson(person: { type: DeliveryKind; archived_at: string | null }) {
  if (person.archived_at) return [] as DeliveryKind[];
  return person.type === "police" ? ["civil", "police"] as DeliveryKind[] : ["civil"] as DeliveryKind[];
}

export function deliveryPreselectionMessage(reason: "archived" | "ineligible" | "not-found", type: DeliveryKind) {
  if (reason === "archived") return "Esta persona está archivada y no puede recibir entregas.";
  if (reason === "ineligible") return type === "police" ? "Esta persona no está habilitada para una entrega policial." : "Esta persona no está habilitada para una entrega civil.";
  return "No encontramos a esta persona.";
}
