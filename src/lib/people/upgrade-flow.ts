export function getUpgradeDialogOptions() {
  return [
    { key: "upgrade", label: "Agregar datos policiales", tone: "primary" as const },
    { key: "view", label: "Ver registro", tone: "secondary" as const },
    { key: "cancel", label: "Cancelar", tone: "ghost" as const },
  ];
}

export function getUpgradeEndpoint(personId: string) {
  return `/api/people/${personId}/upgrade-police`;
}

export function validateUpgradeFields(badgeNumber: string, hasBadgeFile: boolean) {
  if (!badgeNumber.trim()) return "Ingresa el número de placa.";
  if (!hasBadgeFile) return "Agrega una imagen de la placa.";
  return null;
}

export function shouldSuppressAcceptedUpgrade(candidateId: string | null, candidateIdentity: string, acceptedId: string | null, acceptedIdentity: string) {
  return Boolean(candidateId && candidateId === acceptedId && candidateIdentity === acceptedIdentity);
}
