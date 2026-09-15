export type BonusSettings = {
  weeklyGoalMinutes: number;
  peakStart: string;
  peakEnd: string;
  activeDayMinimumMinutes: number;
  peakTargetMinutes: number;
  normalTargetMinutes: number;
  kitsTarget: number;
  activeDaysTarget: number;
  peakWeight: number;
  kitsWeight: number;
  normalWeight: number;
  consistencyWeight: number;
  inactivityAlertDays: number;
  warnsPerStrike: number;
  criticalStrikes: number;
};

export type BonusTier = { position: number; minScore: number; maxScore: number; amount: number };

type RecordValue = Record<string, unknown>;
const asRecord = (input: unknown, label: string): RecordValue => {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error(`${label} inválido.`);
  return input as RecordValue;
};
const integer = (record: RecordValue, key: string, minimum: number) => {
  const value = record[key];
  if (!Number.isInteger(value) || (value as number) < minimum) throw new Error(`${key} debe ser un entero >= ${minimum}.`);
  return value as number;
};
const time = (record: RecordValue, key: string) => {
  const value = record[key];
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value) || Number(value.slice(0, 2)) > 23 || Number(value.slice(3)) > 59) throw new Error(`${key} debe usar HH:mm válido.`);
  return value;
};

export function validateBonusTiers(input: unknown): BonusTier[] {
  if (!Array.isArray(input) || input.length === 0) throw new Error("Debe existir al menos un tier.");
  const tiers = input.map((value) => {
    const record = asRecord(value, "Tier");
    return { position: integer(record, "position", 0), minScore: integer(record, "minScore", 0), maxScore: integer(record, "maxScore", 0), amount: integer(record, "amount", 0) };
  });
  const positions = new Set<number>();
  for (const [index, tier] of tiers.entries()) {
    if (positions.has(tier.position) || tier.position !== index) throw new Error("Los tiers deben tener posiciones únicas y ordenadas.");
    positions.add(tier.position);
    if (tier.minScore > 100 || tier.maxScore > 100 || tier.maxScore < tier.minScore) throw new Error("Rango de tier inválido.");
    const previous = tiers[index - 1];
    if (previous && tier.maxScore + 1 !== previous.minScore) throw new Error("Los tiers no pueden tener gaps u overlaps.");
  }
  if (tiers[0]!.maxScore !== 100 || tiers.at(-1)!.minScore !== 0) throw new Error("Los tiers deben cubrir de 0 a 100.");
  return tiers.map((tier) => ({ ...tier }));
}

export function validateBonusSettings(input: unknown, tiers?: unknown): BonusSettings {
  const record = asRecord(input, "Configuración de bonos");
  const settings: BonusSettings = {
    weeklyGoalMinutes: integer(record, "weeklyGoalMinutes", 1),
    peakStart: time(record, "peakStart"),
    peakEnd: time(record, "peakEnd"),
    activeDayMinimumMinutes: integer(record, "activeDayMinimumMinutes", 1),
    peakTargetMinutes: integer(record, "peakTargetMinutes", 1),
    normalTargetMinutes: integer(record, "normalTargetMinutes", 1),
    kitsTarget: integer(record, "kitsTarget", 1),
    activeDaysTarget: integer(record, "activeDaysTarget", 1),
    peakWeight: integer(record, "peakWeight", 0),
    kitsWeight: integer(record, "kitsWeight", 0),
    normalWeight: integer(record, "normalWeight", 0),
    consistencyWeight: integer(record, "consistencyWeight", 0),
    inactivityAlertDays: integer(record, "inactivityAlertDays", 1),
    warnsPerStrike: integer(record, "warnsPerStrike", 1),
    criticalStrikes: integer(record, "criticalStrikes", 1),
  };
  if (settings.peakStart === settings.peakEnd) throw new Error("El peak period no puede ser vacío.");
  if (settings.peakWeight + settings.kitsWeight + settings.normalWeight + settings.consistencyWeight !== 100) throw new Error("Los weights deben sumar exactamente 100.");
  if (tiers !== undefined) validateBonusTiers(tiers);
  return settings;
}
