export function isDeliveryPersonSelected(selectedId: string | null, personId: string) {
  return selectedId === personId;
}

export function getDeliverySelectionView(selectedId: string | null, mobilePicking: boolean): "picker" | "selected" {
  return selectedId && !mobilePicking ? "selected" : "picker";
}
