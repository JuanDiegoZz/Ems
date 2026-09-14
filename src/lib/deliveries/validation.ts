export type CivilDeliveryInput = Readonly<{ personId: string; quantityLabel: string; clientRequestId: string }>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUANTITY = /^\d{1,12}\s*[xX×]\s*\d{1,12}$/;

export function validateCivilDelivery(input: CivilDeliveryInput) {
  const quantityLabel = input.quantityLabel.trim();
  if (!quantityLabel || quantityLabel.length > 32 || !QUANTITY.test(quantityLabel)) throw new Error("La cantidad debe usar un formato como 10x10");
  if (!UUID.test(input.clientRequestId)) throw new Error("Solicitud de entrega inválida");
  if (!UUID.test(input.personId)) throw new Error("Persona inválida");
  return { personId: input.personId, quantityLabel, clientRequestId: input.clientRequestId };
}

export const validatePoliceDelivery = validateCivilDelivery;
export function isDeliverableCivil(person: { archived_at: string | null; ine_path: string | null }) { return !person.archived_at && Boolean(person.ine_path); }
export function isDeliverablePolice(person: { type: "civil" | "police"; archived_at: string | null; badge_number: string | null; ine_path: string | null; badge_path: string | null }) { return person.type === "police" && !person.archived_at && Boolean(person.badge_number && person.ine_path && person.badge_path); }




