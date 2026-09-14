export type UpgradeablePerson = Readonly<{
  id: string;
  type: "civil" | "police";
  ine_path: string | null;
  badge_path: string | null;
  archived_at: string | null;
}>;

export type PoliceUpgradePlan = Readonly<{
  personId: string;
  deliveryPersonId: string;
  type: "police";
  badgeNumber: string | null;
  inePath: string | null;
  badgePath: string | null;
}>;

export function planPoliceUpgrade(person: UpgradeablePerson, input: { badgeNumber?: string; inePath?: string | null; badgePath?: string | null }): PoliceUpgradePlan {
  if (person.archived_at) throw new Error("La persona está archivada");
  if (person.type !== "civil") throw new Error("La persona ya fue actualizada");
  const badgeNumber = input.badgeNumber?.trim() || null;
  const badgePath = input.badgePath ?? person.badge_path;
  const inePath = person.ine_path ?? input.inePath ?? null;
  if (!badgeNumber && !badgePath) throw new Error("Agrega un número o una imagen de placa");
  return { personId: person.id, deliveryPersonId: person.id, type: "police", badgeNumber, inePath, badgePath };
}

export async function runPoliceUpgradeMutation<T>({ upload, save, cleanup }: {
  upload: () => Promise<string[]>;
  save: (paths: string[]) => Promise<T>;
  cleanup: (paths: string[]) => Promise<void>;
}): Promise<T> {
  let paths: string[] = [];
  try {
    paths = await upload();
    return await save(paths);
  } catch (error) {
    await cleanup(paths);
    throw error;
  }
}
